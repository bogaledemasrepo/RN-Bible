import { makeImageFromView, SkImage } from '@shopify/react-native-skia';
import React, { useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CaptureItemProps {
  children: React.ReactNode;
  onCaptured: (img: SkImage) => void;
}

export default function CaptureItem({
  children,
  onCaptured,
}: CaptureItemProps) {
  const viewRef = useRef<View>(null);
  const isCaptured = useRef(false);

  const handleLayout = () => {
    if (isCaptured.current) return;
    isCaptured.current = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        try {
          if (viewRef.current) {
            // Ref object safely typed for Skia's makeImageFromView
            const image = await makeImageFromView(
              viewRef as unknown as React.RefObject<View>
            );
            if (image) {
              onCaptured(image);
            }
          }
        } catch (e) {
          console.warn('Snapshot capture failed:', e);
        }
      });
    });
  };

  return (
    <View
      ref={viewRef}
      onLayout={handleLayout}
      collapsable={false}
      renderToHardwareTextureAndroid={true}
      style={styles.captureContainer}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  captureContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});
