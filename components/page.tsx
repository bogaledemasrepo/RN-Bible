import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  useRef,
} from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  Skia,
  SkImage,
} from "@shopify/react-native-skia";
import {
  useDerivedValue,
  useSharedValue,
  withTiming,
  runOnJS,
  cancelAnimation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { PageCurlHandle, RenderPageProps } from "../types";
import { pageCurlShader } from "../constants";
import CaptureItem from "./capture-item";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type Props = {
  data?: any[];
  initialIndex?: number;
  onReachStart?: () => void;
  onReachEnd?: () => void;
  renderPage?: (props: RenderPageProps) => React.ReactNode;
  gestureEnabled?: boolean;
};

const PageCurl = forwardRef<PageCurlHandle, Props>(function PageCurl(
  {
    data,
    initialIndex = 0,
    renderPage,
    gestureEnabled = true,
    onReachEnd,
    onReachStart,
  }: Props,
  ref
) {
  const dataLength = data?.length ?? 0;

  // Windowed Texture Cache: Keep maximum of 5 images in memory
  const [viewImages, setViewImages] = useState<Record<number, SkImage>>({});
  const [activeJSIndex, setActiveJSIndex] = useState<number>(initialIndex);

  const currentIndex = useSharedValue(initialIndex);
  const img1Index = useSharedValue(initialIndex);
  const topFlag = useSharedValue(0);
  const currentAnim = useSharedValue<"next" | "prev">("next");
  const startX = useSharedValue(0);
  const progress = useSharedValue(0);
  const isBoundarySwipe = useSharedValue(false);

  // Sync state when dataset changes
  useEffect(() => {
    setViewImages({});
    currentIndex.value = initialIndex;
    img1Index.value = initialIndex;
    setActiveJSIndex(initialIndex);
    progress.value = 0;
  }, [data, initialIndex]);

  const updateJSIndex = useCallback((idx: number) => {
    setActiveJSIndex(idx);
  }, []);

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




  const img1 = useDerivedValue(() => {
    const idx = img1Index.value;

    if (currentAnim.value === "prev") {
      const prevIdx = idx - 1;
      return viewImages[prevIdx] ?? viewImages[idx] ?? null;
    }

    return viewImages[idx] ?? null;
  }, [viewImages, img1Index, currentAnim]);

  const img2 = useDerivedValue(() => {
    const idx = img1Index.value;

    if (currentAnim.value === "prev") {
      return viewImages[idx] ?? img1.value;
    }

    const nextIdx = idx + 1;
    return viewImages[nextIdx] ?? img1.value;
  }, [viewImages, img1Index, currentAnim, img1]);


  const handleSetImage = useCallback(
    (img: SkImage, index: number) => {
      setViewImages((prev) => {
        const nextMap: Record<number, SkImage> = {};
        const minKeep = activeJSIndex - 2;
        const maxKeep = activeJSIndex + 2;


        Object.keys(prev).forEach((key) => {
          const k = Number(key);
          if (k >= minKeep && k <= maxKeep) {
            nextMap[k] = prev[k];
          }
        });

        nextMap[index] = img;
        return nextMap;
      });
    },
    [activeJSIndex]
  );

  const gesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((e) => {
      cancelAnimation(progress);
      startX.value = e.allTouches[0].x;
      isBoundarySwipe.value = false; // Reset boundary lock on touch
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
        // Edge Case 1: First page boundary check
        if (currentIndex.value === 0) {
          isBoundarySwipe.value = true; // 🔒 Lock gesture updates
          if (onReachStart) {
            runOnJS(onReachStart)();
          }
          return;
        }

        // Edge Case 4: Previous page texture readiness check
        const prevIdx = currentIndex.value - 1;
        if (!viewImages[prevIdx]) {
          isBoundarySwipe.value = true; // 🔒 Lock gesture if texture is not ready
          return;
        }

        currentAnim.value = "prev";
        img1Index.value = currentIndex.value;
        progress.value = 1;
      } else {
        // Edge Case 2: Last page boundary check
        if (currentIndex.value >= dataLength - 1) {
          isBoundarySwipe.value = true; // 🔒 Lock gesture updates
          if (onReachEnd) {
            runOnJS(onReachEnd)();
          }
          return;
        }

        // Edge Case 4: Next page texture readiness check
        const nextIdx = currentIndex.value + 1;
        if (!viewImages[nextIdx]) {
          isBoundarySwipe.value = true; // 🔒 Lock gesture if texture is not ready
          return;
        }

        currentAnim.value = "next";
        img1Index.value = currentIndex.value;
        progress.value = 0;
      }

      topFlag.value = e.y < SCREEN_HEIGHT / 2 ? 0 : 1;
    })
    .onChange((e) => {
      if (isBoundarySwipe.value) return; // Ignore drag if at edge!
      if (currentAnim.value === "prev") {
        const deltaX = e.x - startX.value;
        progress.value = Math.max(0, Math.min(1, 1 - deltaX / SCREEN_WIDTH));
      } else {
        const deltaX = startX.value - e.x;
        progress.value = Math.max(0, Math.min(1, deltaX / SCREEN_WIDTH));
      }
    })
    .onEnd((e) => {
      if (isBoundarySwipe.value) return; // Ignore gesture release!
      const deltaX = e.x - startX.value;
      const passedThreshold = Math.abs(deltaX) > SCREEN_WIDTH / 3;

      if (currentAnim.value === "prev") {
        if (passedThreshold) {
          // Swipe Succeeded: Animate progress to 0 (unpeel completely)
          progress.value = withTiming(0, { duration: 220 }, (finished) => {
            if (finished) {
              currentIndex.value--;
              img1Index.value = currentIndex.value;
              runOnJS(updateJSIndex)(currentIndex.value);
            }
          });
        } else {
          // Micro Gesture Canceled: Restore page back to progress 1 without state jumps
          progress.value = withTiming(1, { duration: 180 }, (finished) => {
            if (finished) {
              // Reset progress after gesture finish state is committed
              progress.value = 0;
              currentAnim.value = "next";
            }
          });
        }
      } else {
        if (passedThreshold) {
          // Forward Swipe Succeeded
          progress.value = withTiming(1, { duration: 220 }, (finished) => {
            if (finished) {
              currentIndex.value++;
              img1Index.value = currentIndex.value;
              progress.value = 0;
              runOnJS(updateJSIndex)(currentIndex.value);
            }
          });
        } else {
          // Forward Micro Gesture Canceled
          progress.value = withTiming(0, { duration: 180 });
        }
      }
    })
    .enabled(gestureEnabled);

  const next = useCallback(() => {
    if (currentIndex.value >= dataLength - 1) return;
    currentAnim.value = "next";
    progress.value = withTiming(1, { duration: 300 }, (finished) => {
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
    progress.value = withTiming(0, { duration: 300 }, (finished) => {
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

  // In page.tsx

  const windowIndices = useMemo(() => {
    const indices: number[] = [];

    // Explicitly ensure previous pages are queued FIRST in the DOM tree
    if (activeJSIndex > 0) indices.push(activeJSIndex - 1);
    if (activeJSIndex > 1) indices.push(activeJSIndex - 2);

    // Current active page
    indices.push(activeJSIndex);

    // Forward pages
    if (activeJSIndex < dataLength - 1) indices.push(activeJSIndex + 1);
    if (activeJSIndex < dataLength - 2) indices.push(activeJSIndex + 2);

    return indices;
  }, [activeJSIndex, dataLength]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        <View style={styles.captureGroup} pointerEvents="none">
          {data &&
            windowIndices.map((pageIdx) => {
              if (viewImages[pageIdx]) return null;

              return (
                <CaptureItem
                  key={`capture-${pageIdx}`}
                  onCaptured={(img) => handleSetImage(img, pageIdx)}
                >
                  {renderPage
                    ? renderPage({ item: data[pageIdx], index: pageIdx })
                    : null}
                </CaptureItem>
              );
            })}
        </View>

        <Canvas style={styles.canvas}>
          <Fill color={"#FAF8F5"}>
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
  container: { flex: 1, backgroundColor: "#FAF8F5" },
  captureGroup: { position: "absolute", top: 0, left: 0, opacity: 0, zIndex: -1 },
  canvas: { flex: 1, width: "100%", height: "100%" },
});