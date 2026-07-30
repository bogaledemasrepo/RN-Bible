import React, {
  useRef,
} from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import {
  makeImageFromView,
  SkImage,
} from "@shopify/react-native-skia";

import { RenderPageProps } from "../types";

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


export default function CaptureItem({
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

    // Small delay ensuring layout calculations and font glyphs are finalized
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