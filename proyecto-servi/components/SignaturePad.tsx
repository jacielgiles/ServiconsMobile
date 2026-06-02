import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  hasValidStroke,
  strokesToSvgDataUrl,
  type StrokePoint,
} from '../lib/signatures';

type Props = {
  label: string;
  value: string;
  onCapture: (base64DataUrl: string) => void;
  onDrawingChange?: (drawing: boolean) => void;
};

export function SignaturePad({ label, value, onCapture, onDrawingChange }: Props) {
  const [strokes, setStrokes] = useState<StrokePoint[][]>([]);
  const strokesRef = useRef<StrokePoint[][]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 320, height: 160 });
  const currentStrokeRef = useRef<StrokePoint[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  const allStrokes = useMemo(() => {
    const current = currentStrokeRef.current;
    return current.length > 1 ? [...strokes, current] : strokes;
  }, [strokes, tick]);

  const commitCapture = useCallback(
    (nextStrokes: StrokePoint[][]) => {
      if (!hasValidStroke(nextStrokes)) return false;
      const dataUrl = strokesToSvgDataUrl(nextStrokes, canvasSize.width, canvasSize.height);
      onCapture(dataUrl);
      return true;
    },
    [canvasSize.height, canvasSize.width, onCapture],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          onDrawingChange?.(true);
          const { locationX, locationY } = event.nativeEvent;
          currentStrokeRef.current = [{ x: locationX, y: locationY }];
          setTick((n) => n + 1);
        },
        onPanResponderMove: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          currentStrokeRef.current = [...currentStrokeRef.current, { x: locationX, y: locationY }];
          setTick((n) => n + 1);
        },
        onPanResponderRelease: () => {
          onDrawingChange?.(false);
          if (currentStrokeRef.current.length > 1) {
            const next = [...strokesRef.current, [...currentStrokeRef.current]];
            strokesRef.current = next;
            setStrokes(next);
            commitCapture(next);
          }
          currentStrokeRef.current = [];
          setTick((n) => n + 1);
        },
        onPanResponderTerminate: () => {
          onDrawingChange?.(false);
        },
      }),
    [commitCapture, onDrawingChange],
  );

  const clearPad = () => {
    currentStrokeRef.current = [];
    strokesRef.current = [];
    setStrokes([]);
    onCapture('');
    setTick((n) => n + 1);
  };

  const saved = Boolean(value);

  return (
    <View className="mb-5">
      <Text className="mb-2 text-sm font-semibold text-servi-texto">{label}</Text>

      <View
        className={`overflow-hidden rounded-xl border-2 bg-white ${
          saved ? 'border-emerald-500' : 'border-gray-300'
        }`}
        style={{ height: 160 }}
        onLayout={(e) => {
          const { width } = e.nativeEvent.layout;
          if (width > 0) setCanvasSize({ width, height: 160 });
        }}
        {...panResponder.panHandlers}
      >
        <Svg
          width={canvasSize.width}
          height={160}
          viewBox={`0 0 ${canvasSize.width} 160`}
          style={{ position: 'absolute', left: 0, top: 0 }}
        >
          {allStrokes.map((stroke, index) => {
            if (stroke.length < 2) return null;
            const path = stroke.reduce(
              (acc, point, pointIndex) =>
                pointIndex === 0
                  ? `M ${point.x} ${point.y}`
                  : `${acc} L ${point.x} ${point.y}`,
              '',
            );
            return (
              <Path
                key={`stroke-${index}`}
                d={path}
                stroke="#111827"
                strokeWidth={3.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </Svg>

        {allStrokes.length === 0 ? (
          <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
            <Text className="text-sm text-gray-400">Dibuja tu firma aqui</Text>
          </View>
        ) : null}
      </View>

      {saved ? (
        <View className="mt-2 flex-row items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2">
          <Text className="text-xs font-bold text-emerald-400">Firma capturada</Text>
        </View>
      ) : (
        <Text className="mt-2 text-xs text-servi-suave">
          Mantén el dedo en el recuadro blanco. Se guarda al levantar.
        </Text>
      )}

      <View className="mt-2 flex-row gap-2">
        <Pressable
          className="flex-1 items-center rounded-lg border border-servi-borde py-2.5 active:opacity-80"
          onPress={clearPad}
        >
          <Text className="text-sm text-servi-suave">{saved ? 'Borrar y repetir' : 'Limpiar'}</Text>
        </Pressable>
        <Pressable
          className="flex-1 items-center rounded-lg bg-servi-acento py-2.5 active:opacity-90"
          onPress={() => {
            if (!commitCapture(strokesRef.current)) {
              onCapture('');
            }
          }}
        >
          <Text className="text-sm font-semibold text-servi-fondo">Confirmar firma</Text>
        </Pressable>
      </View>
    </View>
  );
}
