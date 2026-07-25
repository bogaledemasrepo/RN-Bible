import React, {
  forwardRef,
  useCallback,
  useEffect,
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
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { PageCurlHandle, RenderPageProps } from "../types";
import { pageCurlShader } from "../constants";

const { width, height } = Dimensions.get("window");

type Props = {
  images?: any[];
  data?: any[];
  initialIndex?: number;
  onReachStart?: () => void;
  onReachEnd?: () => void;
  renderPage?: (props: RenderPageProps) => React.ReactNode;
  gestureEnabled?: boolean;
};

// ==========================================
// Sub-Component: Off-Screen View Snapshot
// ==========================================
function CaptureItem({
  children,
  onCaptured,
}: {
  children: React.ReactNode;
  onCaptured: (img: SkImage) => void;
}) {
  const viewRef = useRef<View>(null);
  const isCaptured = useRef(false);

  const handleLayout = async () => {
    if (isCaptured.current) return;
    isCaptured.current = true;

    // Small delay to allow font glyphs & views to lay out cleanly
    await new Promise((resolve) => setTimeout(resolve, 60));

    try {
      if (viewRef.current) {
        const image = await makeImageFromView(viewRef as any);
        if (image) {
          onCaptured(image);
        }
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
// Main Component: PageCurl Shader Engine
// ==========================================
const PageCurl = forwardRef<PageCurlHandle, Props>(function PageCurl(
  {
    images,
    data,
    initialIndex = 0,
    renderPage,
    gestureEnabled = true,
    onReachEnd,
    onReachStart,
  }: Props,
  ref
) {
  const dataLength = images?.length ?? data?.length ?? 0;

  // Static loaded image references (if images prop is supplied)
  const loadedImages = images?.map((item: any) => useImage(item));

  // Dynamic Skia Images array (index -> SkImage)
  const [viewImages, setViewImages] = useState<Record<number, SkImage>>({});
  const [activeJSIndex, setActiveJSIndex] = useState<number>(initialIndex);

  // Reanimated Animation Shared Values
  const currentIndex = useSharedValue(initialIndex);
  const img1Index = useSharedValue(initialIndex);
  const topFlag = useSharedValue(0);
  const currentAnim = useSharedValue<"next" | "prev">("next");
  const startX = useSharedValue(0);
  const progress = useSharedValue(0);

  // Sync state when dataset or initial index changes
  useEffect(() => {
    setViewImages({});
    currentIndex.value = initialIndex;
    img1Index.value = initialIndex;
    setActiveJSIndex(initialIndex);
    progress.value = 0;
  }, [data, images, initialIndex]);

  // Sync Reanimated Index back to JS for Windowing
  const updateJSIndex = useCallback((idx: number) => {
    setActiveJSIndex(idx);
  }, []);

  // Shader Setup
  const shaderEffect = useMemo(
    () => Skia.RuntimeEffect.Make(pageCurlShader)!,
    []
  );

  const uniforms = useDerivedValue(
    () => ({
      resolution: [width, height] as [number, number],
      progress: progress.value,
      topFlag: topFlag.value,
    }),
    [progress, topFlag]
  );

  // Active Textures (Subscribed directly by Skia ImageShader without .value reads in render)
  // Active Textures with Zero-Flicker Native Thread Fallback
  const img1 = useDerivedValue(() => {
    const idx = img1Index.value;
    const currentSkImage = loadedImages?.[idx] || viewImages[idx];
    return currentSkImage ?? null;
  }, [loadedImages, viewImages, img1Index]);

  const img2 = useDerivedValue(() => {
    const targetIdx =
      currentAnim.value === "prev" ? img1Index.value - 1 : img1Index.value + 1;

    const targetSkImage = loadedImages?.[targetIdx] || viewImages[targetIdx];

    // If target texture is null or still encoding, seamlessly hold img1's texture value
    if (!targetSkImage) {
      return img1.value;
    }

    return targetSkImage;
  }, [loadedImages, viewImages, img1Index, currentAnim, img1]);

  // Store captured view image
  const handleSetImage = useCallback((img: SkImage, index: number) => {
    setViewImages((prev) => {
      if (prev[index]) return prev;
      return { ...prev, [index]: img };
    });
  }, []);

  // Gesture Controls
  const gesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((e) => {
      startX.value = e.allTouches[0].x;
    })
    .onTouchesMove((e, state) => {
      const deltaX = e.allTouches[0].x - startX.value;
      if (Math.abs(deltaX) >= 10) {
        state.activate();
      }
    })
    .onStart((e) => {
      const isSwipingRight = e.x > startX.value;

      if (isSwipingRight) {
        if (currentIndex.value === 0) {
          if (onReachStart) {
            runOnJS(onReachStart)();
          }
          return;
        }

        currentAnim.value = "prev";
        img1Index.value = currentIndex.value;
        progress.value = 1;
      } else {
        if (currentIndex.value >= dataLength - 1) {
          if (onReachEnd) {
            runOnJS(onReachEnd)();
          }
          return;
        }

        currentAnim.value = "next";
        img1Index.value = currentIndex.value;
        progress.value = 0;
      }

      topFlag.value = e.y < height / 2 ? 0 : 1;
    })
    .onChange((e) => {
      if (currentAnim.value === "prev") {
        const deltaX = e.x - startX.value;
        const unrollProgress = 1 - deltaX / width;
        progress.value = Math.max(0, Math.min(1, unrollProgress));
      } else {
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
          progress.value = withTiming(0, { duration: 250 }, (finished) => {
            if (finished) {
              currentIndex.value--;
              img1Index.value = currentIndex.value;
              runOnJS(updateJSIndex)(currentIndex.value);
            }
          });
        } else {
          progress.value = withTiming(1, { duration: 200 }, (finished) => {
            if (finished) {
              progress.value = 0;
            }
          });
        }
      } else {
        if (passedThreshold) {
          progress.value = withTiming(1, { duration: 250 }, (finished) => {
            if (finished) {
              currentIndex.value++;
              img1Index.value = currentIndex.value;
              progress.value = 0;
              runOnJS(updateJSIndex)(currentIndex.value);
            }
          });
        } else {
          progress.value = withTiming(0, { duration: 200 });
        }
      }
    })
    .enabled(gestureEnabled);

  // Imperative Methods
  const next = useCallback(() => {
    if (currentIndex.value >= dataLength - 1) return;

    currentAnim.value = "next";
    progress.value = withTiming(1, { duration: 400 }, (finished) => {
      if (finished) {
        currentIndex.value++;
        img1Index.value = currentIndex.value;
        progress.value = 0;
        runOnJS(updateJSIndex)(currentIndex.value);
      }
    });
  }, [currentIndex, dataLength, img1Index, progress, updateJSIndex]);

  const prev = useCallback(() => {
    if (currentIndex.value <= 0) return;

    currentAnim.value = "prev";
    progress.value = 1;
    progress.value = withTiming(0, { duration: 400 }, (finished) => {
      if (finished) {
        currentIndex.value--;
        img1Index.value = currentIndex.value;
        runOnJS(updateJSIndex)(currentIndex.value);
      }
    });
  }, [currentIndex, img1Index, progress, updateJSIndex]);

  useImperativeHandle(ref, () => ({ next, prev }), [next, prev]);

  // Windowing: Compute indices around the active page (Prev, Current, Next)
  // Broadened window to capture upcoming pages early in the background
  const windowIndices = useMemo(() => {
    const indices: number[] = [];

    if (activeJSIndex > 0) indices.push(activeJSIndex - 1); // Prev
    indices.push(activeJSIndex);                            // Current
    if (activeJSIndex < dataLength - 1) indices.push(activeJSIndex + 1); // Next
    if (activeJSIndex < dataLength - 2) indices.push(activeJSIndex + 2); // Pre-warm Next+1

    return indices;
  }, [activeJSIndex, dataLength]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        {/* 1. Windowed Off-screen Snapshot Engine - Keeps RAM minimal and prevents crashes */}
        <View style={styles.captureGroup} pointerEvents="none">
          {data &&
            windowIndices.map((pageIdx) => {
              // Skip if already captured
              if (viewImages[pageIdx]) return null;

              return (
                <CaptureItem
                  key={`capture-${pageIdx}`}
                  onCaptured={(img) => handleSetImage(img, pageIdx)}
                >
                  {renderPage ? (
                    renderPage({ item: data[pageIdx], index: pageIdx })
                  ) : (
                    <View style={styles.defaultPage}>
                      <Text style={styles.defaultText}>
                        {data[pageIdx]?.value}
                      </Text>
                    </View>
                  )}
                </CaptureItem>
              );
            })}
        </View>

        {/* 2. Main Skia Canvas Engine */}
        <Canvas style={styles.canvas}>
          <Fill>
            <Shader source={shaderEffect} uniforms={uniforms}>
              <ImageShader
                image={img1}
                fit="cover"
                width={width}
                height={height}
              />
              <ImageShader
                image={img2}
                fit="cover"
                width={width}
                height={height}
              />
            </Shader>
          </Fill>
        </Canvas>
      </View>
    </GestureDetector>
  );
});

export default PageCurl;

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: "#FAF8F5",
  },
  captureGroup: {
    position: "absolute",
    top: 0,
    left: 0,
    opacity: 0,
    zIndex: -1,
  },
  captureContainer: {
    width,
    height,
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
  },
  defaultText: {
    fontSize: 18,
    lineHeight: 30,
    color: "#2C2C2C",
  },
});