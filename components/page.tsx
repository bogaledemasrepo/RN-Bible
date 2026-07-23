import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react"
import { Dimensions, StyleSheet, Text, View } from "react-native"
import {
  Canvas,
  ImageShader,
  Skia,
  Shader,
  useImage,
  Fill,
  makeImageFromView
} from "@shopify/react-native-skia"
import { useDerivedValue, useSharedValue, withSpring, withTiming } from "react-native-reanimated"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { ItemProps, PageCurlHandle, RenderPageProps } from "../types"
import { pageCurlShader } from "../constants"

const { width, height } = Dimensions.get("screen")


type Props = {
  images?: any[]
  data?: string[] | any[]
  renderPage?: (props: RenderPageProps) => React.ReactNode
  gestureEnabled?: boolean
}

function Item({ children, setImages }: ItemProps) {
  const ref = useRef<View>(null);
  const taken = useRef(false);

  const getSnapshot = async () => {
    if (taken.current) return;
    taken.current = true;

    // Allow frames to render completely before taking the snapshot
    await new Promise((r) => setTimeout(r, 100));

    try {
      const image = await makeImageFromView(ref as any);
      if (image) {
        setImages(image);
      }
    } catch (e) {
      console.warn("Snapshot capture failed:", e);
    }
  };

  return (
    <View onLayout={getSnapshot} collapsable={false} ref={ref} style={{ width, height, borderWidth: 1, borderColor: "#333" }}>
      {children}
    </View>
  );
}

const PageCurl = forwardRef<PageCurlHandle, Props>(
  function PageCurl({ images, data, renderPage, gestureEnabled = true }, ref) {
    const dataLength = images?.length ?? data?.length ?? 0

    const imgs = images?.map((item: any) => useImage(item))

    const img1Index = useSharedValue(0)
    const topFlag = useSharedValue(0)
    const currentAnim = useSharedValue("next")
    const currentIndex = useSharedValue(0)
    const startX = useSharedValue(0)

    const effect = useMemo(() => Skia.RuntimeEffect.Make(pageCurlShader)!, [])
    const [viewImages, setViewImages] = useState<any[]>([])

    const progress = useSharedValue(0)

    const uniforms = useDerivedValue(
      () => ({
        resolution: [width, height] as [number, number],
        progress: progress.value,
        topFlag: topFlag.value
      }),
      []
    )

    const img1 = useDerivedValue(() => {
      return imgs?.[img1Index.value] || viewImages[img1Index.value]
    }, [imgs, viewImages])

    const img2 = useDerivedValue(() => {
      return imgs?.[img1Index.value + 1] || viewImages[img1Index.value + 1]
    }, [imgs, viewImages])

    const gesture = Gesture.Pan()
      .manualActivation(true)
      .onTouchesDown((e) => {
        startX.value = e.allTouches[0].x
      })
      .onTouchesMove((e, gesture) => {
        const x = e.allTouches[0].x
        if (
          (x - startX.value > 0 && currentIndex.value === 0) ||
          (x - startX.value < 0 && currentIndex.value === dataLength - 1)
        ) {
          gesture.fail()
          return
        }

        gesture.activate()
      })
      .onStart((e) => {
        if (e.translationX > 0) {
          currentAnim.value = "prev"
          if (img1Index.value !== 0 && currentIndex.value !== dataLength - 1) {
            img1Index.value--
          }
        } else {
          currentAnim.value = "next"
        }
        topFlag.value = e.y < height / 2 ? 0 : 1
      })
      .onChange((e) => {
        progress.value = Math.abs(
          currentAnim.value === "prev"
            ? 1 - e.translationX / width
            : e.translationX / width
        )
      })
      .onEnd((e) => {
        if (Math.abs(e.translationX) > width / 2) {
          progress.value = withSpring(
            currentAnim.value === "next" ? 1 : 0,
            {},
            (finished) => {
              if (finished) {
                currentIndex.value = currentIndex.value + (currentAnim.value === "next" ? 1 : -1)
              }
              if (
                finished &&
                img1Index.value + 1 !== dataLength - 1 &&
                currentAnim.value === "next"
              ) {
                img1Index.value++
                progress.value = 0
              }
            }
          )
        } else {
          progress.value = withTiming(currentAnim.value === "prev" ? 1 : 0)
        }
      })
      .enabled(gestureEnabled)

    const setImages = (img: any, index: number) => {
      setViewImages((prev) => {
        if (prev[index]) return prev
        const next = [...prev]
        next[index] = img
        return next
      })
    }

    const next = () => {
      if (currentIndex.value === dataLength - 1) return

      progress.value = withTiming(1, { duration: 800 }, (finished) => {
        if (finished) {
          currentIndex.value++
        }

        if (finished && img1Index.value + 1 !== dataLength - 1) {
          img1Index.value++
          progress.value = 0
        }
      })
    }

    const prev = () => {
      if (currentIndex.value === 0) return

      if (img1Index.value !== 0 && currentIndex.value !== dataLength - 1) {
        progress.value = 1
        img1Index.value--
      }

      progress.value = withTiming(0, { duration: 800 }, () => {
        if (currentIndex.value !== 0) {
          currentIndex.value--
        }
      })
    }

    useImperativeHandle(ref, () => ({ next, prev }), [next, prev])

    const isCapturing = (!images || images.length === 0) && viewImages.length < (data?.length ?? 0)

    return (
      <GestureDetector gesture={gesture}>
        <View style={{ width, height}}>
          {isCapturing ? (
            // Off-screen capture pass
            data?.map((item, index) => (
              <Item
                key={index}
                setImages={(img) => setImages(img, index)}
              >
                {renderPage ? (
                  renderPage({ item, index })
                ) : (
                  <View style={styles.defaultPage} key={index}>
                    <Text style={styles.defaultText}>
                      {item.value}
                    </Text>
                  </View>
                )}
              </Item>
            ))
          ) : (
            
            // Shader pass after images are captured
            <Canvas style={{ width, height:"100%"}}>
              <Fill>
                <Shader source={effect} uniforms={uniforms}>
                  <ImageShader image={img1} fit="cover" width={width} height={height} />
                  <ImageShader image={img2} fit="cover" width={width} height={height} />
                </Shader>
              </Fill>
            </Canvas>
          )}
        </View>
      </GestureDetector>
    )
  }
)

export default PageCurl;

const styles = StyleSheet.create({
  defaultPage: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#333"
  },
  defaultText: {
    fontSize: 18,
    lineHeight: 30,
    color: '#2C2C2C',
  },
})