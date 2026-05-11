import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  LinearTransition,
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';

/**
 * Layout Animation Race Condition Reproduction Example
 *
 * This example reproduces a crash on Android where UPDATE mutations are added
 * for views that are already deleted.
 *
 * Root Cause (LayoutAnimationsProxy.cpp):
 *
 * - Line 40: addOngoingAnimations() called BEFORE processing removals
 * - Line 53: handleRemovals() processes DELETE mutations
 * - Line 58: addOngoingAnimations() called AGAIN after deletions
 * - Lines 414-473: addOngoingAnimations() iterates updateMap without validating
 *   if views were just deleted
 *
 * Race Condition Sequence:
 *
 * 1. Items are reordered/repositioned, triggering layout animations on all items
 * 2. Layout animations start running, progressLayoutAnimation() updates updateMap
 *    on UI thread
 * 3. JS thread triggers view removal (user action) while layout animations are
 *    active
 * 4. PullTransaction() called with DELETE mutations
 * 5. AddOngoingAnimations() reads stale updateMap and adds UPDATE for deleted tag
 * 6. Crash: "Unable to find viewState for tag [number]"
 *
 * Key: The layout prop causes items to animate their position changes. When we
 * reorder items or add items at the start, existing items animate to their new
 * positions. If we remove them during these layout animations, the race
 * condition occurs because progressLayoutAnimation() has populated updateMap
 * with UPDATE mutations for views that are being deleted in the same
 * transaction.
 *
 * Expected crash on Android: RetryableMountingLayerException
 */

type Item = {
  id: number;
};

export default function LayoutAnimationRaceCondition() {
  const [items, setItems] = useState<Item[]>([]);
  const [animationDuration, setAnimationDuration] = useState(2000);
  const [removeDelay, setRemoveDelay] = useState(50);
  const [batchSize, setBatchSize] = useState(5);
  const [isAutoTest, setIsAutoTest] = useState(false);
  const [operationCount, setOperationCount] = useState(0);
  const autoTestRef = useRef(false);
  const nextIdRef = useRef(0);

  // Initialize with some items so we can trigger layout animations
  useEffect(() => {
    const initialItems: Item[] = [];
    for (let i = 0; i < 3; i++) {
      initialItems.push({ id: nextIdRef.current++ });
    }
    setItems(initialItems);
  }, []);

  const addItems = useCallback(
    (count: number) => {
      const newItems: Item[] = [];
      for (let i = 0; i < count; i++) {
        newItems.push({ id: nextIdRef.current++ });
      }
      // Add items at the beginning to trigger layout animations on existing items
      setItems((prev) => [...newItems, ...prev]);
      console.log(
        `[RaceCondition] Added ${count} items at start. Total: ${items.length + count}. This triggers layout animations on existing items.`
      );
    },
    [items.length]
  );

  const reorderItems = useCallback(() => {
    setItems((prev) => {
      const shuffled = [...prev];
      // Fisher-Yates shuffle
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      console.log(
        `[RaceCondition] Reordered ${shuffled.length} items. Layout animations starting...`
      );
      return shuffled;
    });
  }, []);

  const removeAllItems = useCallback(() => {
    const count = items.length;
    setItems([]);
    console.log(`[RaceCondition] Removed ${count} items`);
  }, [items.length]);

  const runAutoTestCycle = useCallback(() => {
    if (!autoTestRef.current) {
      return;
    }

    const cycleNumber = operationCount + 1;
    console.log(
      `[RaceCondition] Auto test cycle ${cycleNumber} started (items: ${items.length})`
    );

    // Step 1: Add items if we don't have enough
    // Step 2: Trigger layout animation (reorder or add more at start)
    // Step 3: Remove while animations are running

    // First, ensure we have items to animate
    const hasEnoughItems = items.length >= batchSize;

    if (!hasEnoughItems) {
      console.log('[RaceCondition] Adding items to reach batch size...');
      const toAdd = batchSize - items.length;
      addItems(toAdd);

      // Wait a bit for items to render, then trigger animation
      setTimeout(() => {
        if (!autoTestRef.current) return;
        console.log(
          '[RaceCondition] Items rendered, now reordering to trigger layout animations...'
        );
        reorderItems();

        // Now remove while animation is running
        setTimeout(() => {
          if (!autoTestRef.current) return;
          console.log(
            '[RaceCondition] Removing all items while animations are running...'
          );
          removeAllItems();

          setTimeout(() => {
            if (autoTestRef.current) {
              setOperationCount((c) => c + 1);
              runAutoTestCycle();
            }
          }, 100);
        }, removeDelay);
      }, 50);
    } else {
      // We have items, trigger layout animation
      if (cycleNumber % 2 === 0) {
        // Even cycles: Reorder items (triggers layout animations on ALL items)
        console.log(
          '[RaceCondition] Reordering items (triggers layout animations)...'
        );
        reorderItems();
      } else {
        // Odd cycles: Add items at start (causes existing items to shift)
        console.log(
          '[RaceCondition] Adding items at start (triggers layout animations)...'
        );
        addItems(batchSize);
      }

      // Remove while animation is running
      setTimeout(() => {
        if (!autoTestRef.current) return;
        console.log(
          '[RaceCondition] Removing all items while animations are running...'
        );
        removeAllItems();

        setTimeout(() => {
          if (autoTestRef.current) {
            setOperationCount((c) => c + 1);
            runAutoTestCycle();
          }
        }, 100);
      }, removeDelay);
    }
  }, [
    addItems,
    reorderItems,
    removeAllItems,
    batchSize,
    removeDelay,
    operationCount,
    items.length,
  ]);

  const startAutoTest = useCallback(() => {
    console.log('[RaceCondition] Starting auto test...');
    console.log(
      `[RaceCondition] Parameters: duration=${animationDuration}ms, delay=${removeDelay}ms, batch=${batchSize}`
    );
    setIsAutoTest(true);
    autoTestRef.current = true;
    setOperationCount(0);
    runAutoTestCycle();
  }, [animationDuration, removeDelay, batchSize, runAutoTestCycle]);

  const stopAutoTest = useCallback(() => {
    console.log('[RaceCondition] Stopping auto test...');
    setIsAutoTest(false);
    autoTestRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      autoTestRef.current = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Layout Animation Race Condition</Text>
          <Text style={styles.subtitle}>Android Crash Reproduction</Text>
          <Text style={styles.description}>
            This example reproduces a race condition where UPDATE mutations are
            added for already-deleted views during layout animations.
          </Text>
        </View>

        {/* Configuration Panel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>

          <View style={styles.control}>
            <Text style={styles.label}>
              Animation Duration: {animationDuration}ms
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={500}
              maximumValue={3000}
              step={100}
              value={animationDuration}
              onValueChange={setAnimationDuration}
              disabled={isAutoTest}
              minimumTrackTintColor="#b58df1"
              maximumTrackTintColor="#d3d3d3"
            />
          </View>

          <View style={styles.control}>
            <Text style={styles.label}>Remove Delay: {removeDelay}ms</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={500}
              step={10}
              value={removeDelay}
              onValueChange={setRemoveDelay}
              disabled={isAutoTest}
              minimumTrackTintColor="#b58df1"
              maximumTrackTintColor="#d3d3d3"
            />
          </View>

          <View style={styles.control}>
            <Text style={styles.label}>Batch Size: {batchSize} items</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={batchSize}
              onValueChange={setBatchSize}
              disabled={isAutoTest}
              minimumTrackTintColor="#b58df1"
              maximumTrackTintColor="#d3d3d3"
            />
          </View>
        </View>

        {/* Auto Test Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auto Test Mode</Text>
          <Text style={styles.helperText}>
            Continuously reorders/adds items (triggers layout animations), then
            removes them while animations are running
          </Text>
          <View style={styles.buttonRow}>
            {!isAutoTest ? (
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={startAutoTest}>
                <Text style={styles.buttonTextPrimary}>Start Auto Test</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.buttonDanger]}
                onPress={stopAutoTest}>
                <Text style={styles.buttonTextPrimary}>Stop Auto Test</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Manual Test Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manual Test Mode</Text>
          <Text style={styles.helperText}>
            Reorder items (triggers layout animations on ALL items), then
            quickly "Remove All" while animations are running
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={reorderItems}
              disabled={isAutoTest || items.length === 0}>
              <Text
                style={[
                  styles.buttonTextSecondary,
                  (isAutoTest || items.length === 0) &&
                    styles.buttonTextDisabled,
                ]}>
                Reorder Items
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={removeAllItems}
              disabled={isAutoTest}>
              <Text
                style={[
                  styles.buttonTextSecondary,
                  isAutoTest && styles.buttonTextDisabled,
                ]}>
                Remove All
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => addItems(batchSize)}
              disabled={isAutoTest}>
              <Text
                style={[
                  styles.buttonTextSecondary,
                  isAutoTest && styles.buttonTextDisabled,
                ]}>
                Add Items (at start)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Display */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Operations:</Text>
            <Text style={styles.statusValue}>{operationCount}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Active Items:</Text>
            <Text style={styles.statusValue}>{items.length}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Auto Test:</Text>
            <Text
              style={[
                styles.statusValue,
                isAutoTest ? styles.statusActive : styles.statusInactive,
              ]}>
              {isAutoTest ? 'Running' : 'Stopped'}
            </Text>
          </View>
        </View>

        {/* Animated Items Container */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Animated Items ({items.length})
          </Text>
          <View style={styles.itemsContainer}>
            {items.map((item) => (
              <Animated.View
                key={item.id}
                layout={LinearTransition.duration(animationDuration)}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={styles.item}>
                <Text style={styles.itemText}>Item {item.id}</Text>
              </Animated.View>
            ))}
            {items.length === 0 && (
              <Text style={styles.emptyText}>No items</Text>
            )}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Reproduce</Text>
          <Text style={styles.instructionText}>
            1. Click "Start Auto Test" to run continuous cycles
          </Text>
          <Text style={styles.instructionText}>
            2. Auto test will reorder items (triggering layout animations), then
            remove them while animations are active
          </Text>
          <Text style={styles.instructionText}>
            3. Observe crash within 10-50 cycles on Android
          </Text>
          <Text style={styles.instructionText}>
            4. Or manually: "Reorder Items" → quickly "Remove All"
          </Text>
          <Text style={styles.instructionText}>
            5. Tune parameters if crash doesn't occur:
          </Text>
          <Text style={styles.instructionSubText}>
            - Reduce delay to 0ms (immediate removal)
          </Text>
          <Text style={styles.instructionSubText}>
            - Increase duration to 3000ms (longer animation window)
          </Text>
          <Text style={styles.instructionSubText}>
            - Increase batch size to 10 items
          </Text>
        </View>

        {/* Expected Crash Info */}
        <View style={[styles.section, styles.crashInfo]}>
          <Text style={styles.crashTitle}>Expected Crash (Android)</Text>
          <Text style={styles.crashText}>
            RetryableMountingLayerException:{'\n'}
            Unable to find viewState for tag [number]
          </Text>
          <Text style={styles.crashText}>
            {'\n'}at SurfaceMountingManager.updateProps{'\n'}
            at IntBufferBatchMountItem.execute{'\n'}
            at NativeProxy.performOperations
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222534',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#b58df1',
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222534',
    marginBottom: 12,
  },
  control: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#222534',
    marginBottom: 8,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#b58df1',
  },
  buttonDanger: {
    backgroundColor: '#dc3545',
  },
  buttonSecondary: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#b58df1',
  },
  buttonTextPrimary: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    color: '#b58df1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextDisabled: {
    color: '#ccc',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222534',
  },
  statusActive: {
    color: '#28a745',
  },
  statusInactive: {
    color: '#666',
  },
  itemsContainer: {
    gap: 8,
  },
  item: {
    padding: 16,
    backgroundColor: '#b58df1',
    borderRadius: 8,
  },
  itemText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    padding: 20,
    fontStyle: 'italic',
  },
  instructionText: {
    fontSize: 14,
    color: '#222534',
    marginBottom: 8,
    lineHeight: 20,
  },
  instructionSubText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 16,
    marginBottom: 4,
    lineHeight: 18,
  },
  crashInfo: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  crashTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  crashText: {
    fontSize: 12,
    color: '#856404',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});
