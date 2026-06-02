import { Text, View } from 'react-native';

import type { EvidenceStampMeta } from '../lib/evidenceMeta';
import { GoogleMapsActions } from './GoogleMapsActions';
import { ReportMapView } from './ReportMapView';
import { StampedEvidenceImage } from './StampedEvidenceImage';

type Props = {
  index: number;
  latitud: number;
  longitud: number;
  timestamp: string;
  urlImagen?: string | null;
  observaciones?: string | null;
  metadata?: EvidenceStampMeta | Record<string, unknown> | null;
  compact?: boolean;
};

export function EvidenciaReportCard({
  index,
  latitud,
  longitud,
  timestamp,
  urlImagen,
  observaciones,
  metadata,
  compact = false,
}: Props) {
  const when = new Date(timestamp);
  const stamp = metadata as EvidenceStampMeta | undefined;

  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-servi-borde bg-servi-superficie">
      <View className="flex-row items-center justify-between bg-servi-primario/10 px-4 py-3">
        <View>
          <Text className="text-xs uppercase text-servi-suave">Reporte #{index}</Text>
          <Text className="text-sm font-semibold text-servi-texto">
            {when.toLocaleDateString()} · {when.toLocaleTimeString()}
          </Text>
        </View>
        <View className="rounded-full bg-servi-acento px-2 py-1">
          <Text className="text-[10px] font-bold text-servi-fondo">GPS</Text>
        </View>
      </View>

      <View className="p-3">
        <ReportMapView
          points={[{ lat: latitud, lng: longitud, id: `ev-${index}`, label: `Reporte ${index}` }]}
          height={compact ? 140 : 170}
          title="Ubicacion del reporte"
          showOpenMaps={false}
        />

        <View className="mt-3">
          <GoogleMapsActions
            lat={latitud}
            lng={longitud}
            label={`Reporte ${index}`}
            coordsLabel="Coordenadas exactas"
            variant={compact ? 'compact' : 'full'}
          />
        </View>

        {urlImagen ? (
          stamp ? (
            <View className="mt-3">
              <StampedEvidenceImage uri={urlImagen} meta={stamp} height={compact ? 180 : 220} />
            </View>
          ) : (
            <View className="mt-3 overflow-hidden rounded-xl">
              <StampedEvidenceImage
                uri={urlImagen}
                meta={{
                  timestamp,
                  lat: latitud,
                  lng: longitud,
                  custodioNombre: 'Custodio',
                  servicioNombre: 'Servicio',
                  empresa: '',
                  unidad: '',
                  ruta: observaciones ?? '',
                  numeroReporte: index,
                }}
                height={compact ? 180 : 220}
              />
            </View>
          )
        ) : (
          <View className="mt-3 items-center rounded-xl border border-dashed border-servi-borde py-6">
            <Text className="text-sm text-servi-suave">Sin foto en este reporte</Text>
          </View>
        )}

        {observaciones ? (
          <Text className="mt-2 text-xs text-servi-suave">{observaciones}</Text>
        ) : null}
      </View>
    </View>
  );
}
