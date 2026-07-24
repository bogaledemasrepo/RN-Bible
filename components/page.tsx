import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import {
  Canvas,
  Fill,
  ImageShader,
  makeImageFromView,
  Shader,
  Skia,
  useImage,
  SkImage,
} from "@shopify/react-native-skia";
import {
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { ItemProps, PageCurlHandle, RenderPageProps } from "../types";
import { pageCurlShader } from "../constants";

const { width, height } = Dimensions.get("screen");

type Props = {
  images?: any[];
  data?: any[];
  onReachStart?: () => void; // Triggered when swiping back on page 0
  onReachEnd?: () => void;   // Triggered when swiping forward on last page
  renderPage?: (props: RenderPageProps) => React.ReactNode;
  gestureEnabled?: boolean;
  chapterTitle?: string;
};

// ==========================================
// Sub-Component: Off-Screen View Snapshot Item
// ==========================================
function CaptureItem({ children, setImages }: ItemProps) {
  const viewRef = useRef<View>(null);
  const isCaptured = useRef(false);

  const handleLayout = async () => {
    if (isCaptured.current) return;
    isCaptured.current = true;

    // Brief delay to allow views to settle before snapshot
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      const image = await makeImageFromView(viewRef as any);
      if (image) {
        setImages(image);
      }
    } catch (e) {
      console.warn("Snapshot capture failed:", e);
    }
  };

  return (
    <View
      ref={viewRef}
      onLayout={handleLayout}
      collapsable={false}
      style={styles.captureContainer}
    >
      {children}
    </View>
  );
}

// ==========================================
// Main Component: PageCurl Shader View
// ==========================================
const PageCurl = forwardRef<PageCurlHandle, Props>(function PageCurl(
  { images, data, renderPage, gestureEnabled = true, onReachEnd, onReachStart, chapterTitle }: Props,
  ref
) {
  const dataLength = images?.length ?? data?.length ?? 0;

  // Skia Resources & State
  const loadedImages = images?.map((item: any) => useImage(item));
  const [viewImages, setViewImages] = useState<SkImage[]>([]);

  // Animation Shared Values
  const img1Index = useSharedValue(0);
  const topFlag = useSharedValue(0);
  const currentAnim = useSharedValue<"next" | "prev">("next");
  const currentIndex = useSharedValue(0);
  const startX = useSharedValue(0);
  const progress = useSharedValue(0);

  // Compile Skia Shader
  const shaderEffect = useMemo(
    () => Skia.RuntimeEffect.Make(pageCurlShader)!,
    []
  );

  // Shader Uniforms
  const uniforms = useDerivedValue(
    () => ({
      resolution: [width, height] as [number, number],
      progress: progress.value,
      topFlag: topFlag.value,
    }),
    [progress, topFlag]
  );

  // ==========================================
  // Texture Selection for Forward & Backward
  // ==========================================
  const img1 = useDerivedValue(() => {
    const idx = img1Index.value;
    return loadedImages?.[idx] || viewImages[idx];
  }, [loadedImages, viewImages, img1Index]);

  const img2 = useDerivedValue(() => {
    // When swiping backward, show the previous index underneath
    const idx = currentAnim.value === "prev" ? img1Index.value - 1 : img1Index.value + 1;
    return loadedImages?.[idx] || viewImages[idx];
  }, [loadedImages, viewImages, img1Index, currentAnim]);

  // ==========================================
  // Pan Gesture Update
  // ==========================================
  const gesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((e) => {
      startX.value = e.allTouches[0].x;
    })
    .onTouchesMove((e, state) => {
      const currentX = e.allTouches[0].x;
      const deltaX = currentX - startX.value;

      // Must move at least 10px to determine direction reliably
      if (Math.abs(deltaX) < 10) return;

      const isAtStart = deltaX > 0 && currentIndex.value === 0;
      const isAtEnd = deltaX < 0 && currentIndex.value === dataLength - 1;

      if (isAtStart || isAtEnd) {
        state.fail();
        return;
      }

      state.activate();
    })
    .onStart((e) => {
      console.log("Gesture Start:", e.x, e.y);

      const isSwipingRight = e.x > startX.value;

      if (isSwipingRight) {
        // 1. BACKWARD BOUNDARY CHECK

        if (currentIndex.value === 0) {
          if (onReachStart) {
            console.log("Reached start of chapter. Loading previous chapter...");
            runOnJS(onReachStart)(); // Call prev chapter handler safely
          }
          return;
        }

        currentAnim.value = "prev";
        img1Index.value = currentIndex.value - 1;
        progress.value = 1;

      } else {
        // 2. FORWARD BOUNDARY CHECK
        if (currentIndex.value === dataLength - 1) {
          if (onReachEnd) {
            console.log("Reached end of chapter. Loading next chapter...");
            runOnJS(onReachEnd)(); // Call next chapter handler safely
          }
          return;
        }

        currentAnim.value = "next";
        img1Index.value = currentIndex.value;
        progress.value = 0;

      }
      console.log("Current Index:", currentIndex.value);
      topFlag.value = e.y < height / 2 ? 0 : 1;
    })
    .onChange((e) => {
      if (currentAnim.value === "prev") {
        // Swiping right (positive drag from startX):
        // Progress reduces from 1 down toward 0 as you unroll the page
        const deltaX = e.x - startX.value;
        const unrollProgress = 1 - deltaX / width;
        progress.value = Math.max(0, Math.min(1, unrollProgress));
      } else {
        // Swiping left (negative drag from startX):
        // Progress increases from 0 up toward 1
        const deltaX = startX.value - e.x;
        const curlProgress = deltaX / width;
        progress.value = Math.max(0, Math.min(1, curlProgress));
      }
    })
    .onEnd((e) => {
      const deltaX = e.x - startX.value;
      const passedThreshold = Math.abs(deltaX) > width / 3;

      if (currentAnim.value === "prev") {
        if (passedThreshold) {
          // Complete backward flip
          progress.value = withTiming(0, { duration: 250 }, (finished) => {
            if (finished) {
              currentIndex.value--;
            }
          });
        } else {
          // Cancel backward flip: re-curl back off-screen to 1 and restore index
          progress.value = withTiming(1, { duration: 200 }, (finished) => {
            if (finished) {
              img1Index.value = currentIndex.value;
              progress.value = 0;
            }
          });
        }
      } else {
        if (passedThreshold) {
          // Complete forward flip
          progress.value = withTiming(1, { duration: 250 }, (finished) => {
            if (finished) {
              currentIndex.value++;
              img1Index.value = currentIndex.value;
              progress.value = 0;
            }
          });
        } else {
          // Cancel forward flip
          progress.value = withTiming(0, { duration: 200 });
        }
      }
    })
    .enabled(gestureEnabled);

  // Store Captured Image Handlers
  const handleSetImage = useCallback((img: SkImage, index: number) => {
    setViewImages((prev) => {
      if (prev[index]) return prev;
      const next = [...prev];
      next[index] = img;
      return next;
    });
  }, []);

  // Imperative Controller Methods
  const next = useCallback(() => {
    if (currentIndex.value === dataLength - 1) return;

    progress.value = withTiming(1, { duration: 800 }, (finished) => {
      if (finished) {
        currentIndex.value++;
      }
      if (finished && img1Index.value + 1 !== dataLength - 1) {
        img1Index.value++;
        progress.value = 0;
      }
    });
  }, [currentIndex, dataLength, img1Index, progress]);

  const prev = useCallback(() => {
    if (currentIndex.value <= 0) return;

    currentAnim.value = "prev";
    progress.value = 1;

    progress.value = withTiming(0, { duration: 400 }, (finished) => {
      if (finished) {
        currentIndex.value--;
        img1Index.value--;
      }
    });
  }, [currentIndex, img1Index, progress, currentAnim]);

  useImperativeHandle(ref, () => ({ next, prev }), [next, prev]);

  const isCapturing =
    (!images || images.length === 0) && viewImages.length < (data?.length ?? 0);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        {isCapturing ? (
          // Snapshot Capture Stage
          data?.map((item, index) => (
            <CaptureItem
              key={index}
              setImages={(img) => handleSetImage(img, index)}
            >
              {renderPage ? (
                renderPage({ item, index })
              ) : (
                <View style={styles.defaultPage}>
                  <Text style={styles.defaultText}>{item.value}</Text>
                </View>
              )}
            </CaptureItem>
          ))
        ) : (
          // Skia Shader Rendering Stage
          <Canvas style={styles.canvas}>
            <Fill>
              <Shader source={shaderEffect} uniforms={uniforms}>
                <ImageShader image={img1} fit="cover" width={width} height={height} />
                <ImageShader image={img2} fit="cover" width={width} height={height} />
              </Shader>
            </Fill>
          </Canvas>
        )}
      </View>
    </GestureDetector>
  );
});

export default PageCurl;

const styles = StyleSheet.create({
  container: {
    width,
    height,
  },
  captureContainer: {
    width,
    height,
    borderWidth: 1,
    borderColor: "#333",
  },
  canvas: {
    width,
    height: "100%",
  },
  defaultPage: {
    flex: 1,
    backgroundColor: "#FAF8F5",
    padding: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  defaultText: {
    fontSize: 18,
    lineHeight: 30,
    color: "#2C2C2C",
  },
});