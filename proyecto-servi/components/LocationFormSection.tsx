import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, Text, View } from 'react-native';

import {
  buildGoogleMapsUbicacionUrl,
  formatUbicacionAddress,
  hasUbicacionAddress,
  hasUbicacionCoords,
} from '../lib/ubicacionAddress';
import type { Ubicacion } from '../types/models';
import { WizardField } from './WizardField';

type Props = {
  ubicacion: Ubicacion;
  onChange: (next: Ubicacion) => void;
  tone: 'green' | 'red';
  title: string;
};

export function LocationFormSection({ ubicacion, onChange, tone, title }: Props) {
  const patch = (partial: Partial<Ubicacion>) => onChange({ ...ubicacion, ...partial });
  const addressPreview = formatUbicacionAddress(ubicacion);
  const canPreview = hasUbicacionAddress(ubicacion) || hasUbicacionCoords(ubicacion);

  const openMaps = () => {
    const url = buildGoogleMapsUbicacionUrl(ubicacion, title);
    void Linking.openURL(url);
  };

  return (
    <View>
      <WizardField
        label="Calle y numero *"
        value={ubicacion.calle ?? ''}
        placeholder="Ej. Av. Constitucion 1500"
        onChangeText={(v) => patch({ calle: v })}
        required
      />
      <View className="mb-1 flex-row gap-3">
        <View className="flex-1">
          <WizardField
            label="No. exterior"
            value={ubicacion.numeroExterior ?? ''}
            placeholder="1500"
            onChangeText={(v) => patch({ numeroExterior: v })}
            keyboardType="number-pad"
          />
        </View>
        <View className="flex-1">
          <WizardField
            label="Codigo postal *"
            value={ubicacion.codigoPostal ?? ''}
            placeholder="64000"
            onChangeText={(v) => patch({ codigoPostal: v.replace(/\D/g, '').slice(0, 5) })}
            keyboardType="number-pad"
            required
          />
        </View>
      </View>
      <WizardField
        label="Colonia"
        value={ubicacion.colonia ?? ''}
        placeholder="Ej. Centro, Industrial..."
        onChangeText={(v) => patch({ colonia: v })}
      />
      <WizardField
        label="Ciudad"
        value={ubicacion.ciudad ?? ''}
        placeholder="Si difiere del municipio"
        onChangeText={(v) => patch({ ciudad: v })}
      />
      <View className="mb-1 flex-row gap-3">
        <View className="flex-1">
          <WizardField
            label="Municipio / alcaldia *"
            value={ubicacion.municipio}
            placeholder="Monterrey"
            onChangeText={(v) => patch({ municipio: v })}
            required
          />
        </View>
        <View className="flex-1">
          <WizardField
            label="Estado *"
            value={ubicacion.estado}
            placeholder="Nuevo Leon"
            onChangeText={(v) => patch({ estado: v })}
            required
          />
        </View>
      </View>
      <WizardField
        label="Referencia (opcional)"
        value={ubicacion.referencia ?? ''}
        placeholder="Entre calles, acceso, punto de encuentro..."
        onChangeText={(v) => patch({ referencia: v })}
        multiline
      />
      <WizardField
        label="Personal asignado en sitio"
        value={ubicacion.personalAsignado}
        placeholder="Nombre del contacto en origen/destino"
        onChangeText={(v) => patch({ personalAsignado: v })}
      />

      <View
        className={`mb-3 rounded-xl border px-3 py-3 ${
          tone === 'green' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'
        }`}
      >
        <Text className="mb-2 text-xs font-bold uppercase text-servi-suave">
          Coordenadas GPS (opcional, mas precision)
        </Text>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <WizardField
              label="Latitud"
              value={ubicacion.lat ?? ''}
              placeholder="19.432608"
              onChangeText={(v) => patch({ lat: v })}
              keyboardType="decimal-pad"
            />
          </View>
          <View className="flex-1">
            <WizardField
              label="Longitud"
              value={ubicacion.lng ?? ''}
              placeholder="-99.133209"
              onChangeText={(v) => patch({ lng: v })}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </View>

      {canPreview ? (
        <View className="overflow-hidden rounded-xl border border-[#4285F4]/35 bg-[#4285F4]/8">
          <View className="border-b border-[#4285F4]/20 px-3 py-2">
            <Text className="text-[10px] font-bold uppercase text-servi-suave">
              Vista previa para Google Maps
            </Text>
            <Text className="mt-1 text-sm leading-5 text-servi-texto">{addressPreview}</Text>
          </View>
          <Pressable
            className="flex-row items-center justify-center gap-2 py-3 active:opacity-90"
            onPress={openMaps}
          >
            <Ionicons name="logo-google" size={18} color="#4285F4" />
            <Text className="text-sm font-bold text-[#4285F4]">Probar en Google Maps</Text>
          </Pressable>
        </View>
      ) : (
        <Text className="text-xs text-servi-suave">
          Completa calle, CP, municipio y estado para validar la direccion en Google Maps.
        </Text>
      )}
    </View>
  );
}
