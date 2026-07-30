import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import {
  Canvas,
  Fill,
  ImageShader,
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
import CaptureItem from "./capture-item";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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

  // Static image references (if loading static assets)
  const loadedImages = images?.map((item: any) => useImage(item));

  // Dynamic Skia Texture Cache Map (index -> SkImage)
  const [viewImages, setViewImages] = useState<Record<number, SkImage>>({});
  const [activeJSIndex, setActiveJSIndex] = useState<number>(initialIndex);

  // Reanimated Shared Values
  const currentIndex = useSharedValue(initialIndex);
  const img1Index = useSharedValue(initialIndex);
  const topFlag = useSharedValue(0);
  const currentAnim = useSharedValue<"next" | "prev">("next");
  const startX = useSharedValue(0);
  const progress = useSharedValue(0);

  // Sync state when dataset changes
  useEffect(() => {
    setViewImages({});
    currentIndex.value = initialIndex;
    img1Index.value = initialIndex;
    setActiveJSIndex(initialIndex);
    progress.value = 0;
  }, [data, images, initialIndex]);

  // Sync Reanimated Index back to JS thread for windowing
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
      resolution: [SCREEN_WIDTH, SCREEN_HEIGHT] as [number, number],
      progress: progress.value,
      topFlag: topFlag.value,
    }),
    [progress, topFlag]
  );

  // Active Shader Textures with Zero-Flicker Fallback
  const img1 = useDerivedValue(() => {
    const idx = img1Index.value;
    const currentSkImage = loadedImages?.[idx] || viewImages[idx];
    return currentSkImage ?? null;
  }, [loadedImages, viewImages, img1Index]);

  const img2 = useDerivedValue(() => {
    const targetIdx =
      currentAnim.value === "prev" ? img1Index.value - 1 : img1Index.value + 1;

    const targetSkImage = loadedImages?.[targetIdx] || viewImages[targetIdx];

    // Hold current texture if target texture is still rendering to avoid blank canvas frames
    if (!targetSkImage) {
      return img1.value;
    }

    return targetSkImage;
  }, [loadedImages, viewImages, img1Index, currentAnim, img1]);

  // Store newly captured SkImage texture
  const handleSetImage = useCallback((img: SkImage, index: number) => {
    setViewImages((prev) => {
      if (prev[index]) return prev;
      return { ...prev, [index]: img };
    });
  }, []);

  // Gesture Handler Engine
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

      topFlag.value = e.y < SCREEN_HEIGHT / 2 ? 0 : 1;
    })
    .onChange((e) => {
      if (currentAnim.value === "prev") {
        const deltaX = e.x - startX.value;
        const unrollProgress = 1 - deltaX / SCREEN_WIDTH;
        progress.value = Math.max(0, Math.min(1, unrollProgress));
      } else {
        const deltaX = startX.value - e.x;
        const curlProgress = deltaX / SCREEN_WIDTH;
        progress.value = Math.max(0, Math.min(1, curlProgress));
      }
    })
    .onEnd((e) => {
      const deltaX = e.x - startX.value;
      const passedThreshold = Math.abs(deltaX) > SCREEN_WIDTH / 3;

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

  // Imperative Handles (Next, Prev, Instant Jump)
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

  const jumpTo = useCallback(
    (targetIndex: number) => {
      const clampedIndex = Math.max(0, Math.min(targetIndex, dataLength - 1));
      currentIndex.value = clampedIndex;
      img1Index.value = clampedIndex;
      progress.value = 0;
      runOnJS(updateJSIndex)(clampedIndex);
    },
    [currentIndex, dataLength, img1Index, progress, updateJSIndex]
  );

  useImperativeHandle(ref, () => ({ next, prev, jumpTo }), [next, prev, jumpTo]);
  
  // Windowed Indexing (Captures Prev, Active, Next, and Next+1 to pre-warm GPU)
  const windowIndices = useMemo(() => {
    const indices: number[] = [];
    if (activeJSIndex > 1) indices.push(activeJSIndex - 2);
    if (activeJSIndex > 0) indices.push(activeJSIndex - 1);
    indices.push(activeJSIndex);
    if (activeJSIndex < dataLength - 1) indices.push(activeJSIndex + 1);
    if (activeJSIndex < dataLength - 2) indices.push(activeJSIndex + 2);

    return indices;
  }, [activeJSIndex, dataLength]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        {/* 1. Off-screen Windowed Capture Engine */}
        <View style={styles.captureGroup} pointerEvents="none">
          {data &&
            windowIndices.map((pageIdx) => {
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
                        {data[pageIdx]?.value} 11
                      </Text>
                    </View>
                  )}
                </CaptureItem>
              );
            })}
        </View>

        {/* 2. Primary Skia WebGL-level Canvas Engine */}
        <Canvas style={styles.canvas}>
          <Fill color={"#817b7b"}>
            <Shader source={shaderEffect} uniforms={uniforms}>
              <ImageShader
                image={img1}
                fit="cover"
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
              />
              <ImageShader
                image={img2}
                fit="cover"
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
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
    flex: 1,
    width: "100%",
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
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  canvas: {
    flex: 1,
    width: "100%",
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