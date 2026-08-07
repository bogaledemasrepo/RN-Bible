import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  bookName?: string;
  message?: string;
};

// Ethiopian Orthodox Style Cross SVG
function CrossIcon({ size = 48, color = '#8B0000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 2H13V8H19V10H13V15H17V17H13V22H11V17H7V15H11V10H5V8H11V2Z"
        fill={color}
      />
      <Path
        d="M9 4H15V6H9V4ZM9 18H15V20H9V18ZM4 9H6V15H4V9ZM18 9H20V15H18V9Z"
        fill={color}
        opacity={0.6}
      />
    </Svg>
  );
}

export function ProfessionalLoader({ bookName, message = 'በመጫን ላይ...' }: Props) {
  // Shared values for smooth Reanimated 3 animations
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    // Continuous rotation for outer spinner ring
    rotation.value = withRepeat(
      withTiming(360, { duration: 1600, easing: Easing.linear }),
      -1,
      false
    );

    // Breathing pulse for center Cross icon
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800, easing: Easing.ease }),
        withTiming(1.0, { duration: 800, easing: Easing.ease })
      ),
      -1,
      true
    );
  }, [rotation, pulse]);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.15], [0.85, 1]),
  }));

  return (
    <View style={styles.container}>
      {/* Visual Anchor Box */}
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          {/* Animated Rotating Ring */}
          <Animated.View style={[styles.spinnerRing, spinnerStyle]} />

          {/* Breathing Ethiopian Cross */}
          <Animated.View style={[styles.iconWrapper, pulseStyle]}>
            <CrossIcon size={40} color="#8B0000" />
          </Animated.View>
        </View>

        {/* Dynamic Context Label */}
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
          {bookName ? (
            <Text style={styles.bookTitle}>{bookName}</Text>
          ) : null}
          <Text style={styles.statusText}>{message}</Text>
        </Animated.View>

        {/* Minimal Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressIndicator, spinnerStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
  },
  card: {
    width: SCREEN_WIDTH * 0.75,
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconContainer: {
    width: 88,
    height: 88,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  spinnerRing: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: '#F8FAF2',
    borderTopColor: '#8B0000',
    borderRightColor: '#8B0000',
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'System',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  progressTrack: {
    width: 48,
    height: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressIndicator: {
    width: '100%',
    height: '100%',
    backgroundColor: '#8B0000',
    borderRadius: 2,
  },
});