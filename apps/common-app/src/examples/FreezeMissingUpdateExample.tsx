import React, { useEffect, useState } from 'react';
import { Freeze } from 'react-freeze';
import { Button, StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

const SMALL_HEIGHT = 100;
const LARGE_HEIGHT = 200;

function AnimatedStyleAnimation({ sv }: { sv: SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => {
    console.log('[FreezeMissingUpdate] animated style height', sv.value);

    return {
      height: sv.value,
    };
  });

  return (
    <Animated.View
      nativeID="freeze-target-box"
      onLayout={(event) => {
        console.log(
          '[FreezeMissingUpdate] onLayout height',
          event.nativeEvent.layout.height
        );
      }}
      style={[styles.box, animatedStyle]}
    />
  );
}

export default function FreezeMissingUpdateExample() {
  const sharedValue = useSharedValue(SMALL_HEIGHT);
  const [freezed, setFreezed] = useState(false);
  const [status, setStatus] = useState('initial height 100');

  useEffect(() => {
    const timers = [
      setTimeout(() => {
        console.log('[FreezeMissingUpdate] freeze subtree');
        setStatus('frozen');
        setFreezed(true);
      }, 1000),
      setTimeout(() => {
        console.log('[FreezeMissingUpdate] set height 200 while frozen');
        sharedValue.value = LARGE_HEIGHT;
      }, 2000),
      setTimeout(() => {
        console.log('[FreezeMissingUpdate] unfreeze subtree');
        setStatus('unfrozen, expected height 200');
        setFreezed(false);
      }, 3000),
    ];

    return () => {
      timers.forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, [sharedValue]);

  let freezeButtonTitle = 'Freeze';
  if (freezed) {
    freezeButtonTitle = 'Unfreeze';
  }

  return (
    <View style={styles.container}>
      <Text>Freeze missing update</Text>
      <Text>{status}</Text>
      <Button
        onPress={() => {
          setFreezed((isFreezed) => !isFreezed);
        }}
        title={freezeButtonTitle}
      />
      <Button
        title="Toggle height"
        onPress={() => {
          if (sharedValue.value === SMALL_HEIGHT) {
            sharedValue.value = LARGE_HEIGHT;
            return;
          }

          sharedValue.value = SMALL_HEIGHT;
        }}
      />
      <Freeze freeze={freezed}>
        <View collapsable={false} nativeID="freeze-wrapper">
          <AnimatedStyleAnimation sv={sharedValue} />
        </View>
      </Freeze>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 40,
  },
  box: {
    width: 100,
    backgroundColor: 'pink',
  },
});
