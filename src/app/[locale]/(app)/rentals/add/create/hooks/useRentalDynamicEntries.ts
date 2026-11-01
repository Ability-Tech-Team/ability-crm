'use client';

import { useState } from 'react';
import type { LocalRelative, LocalVehicle } from '../types';
import { createEmptyRelative, createEmptyVehicle } from '../utils';

export function useRentalDynamicEntries() {
  const [tenantAttachments, setTenantAttachments] = useState<File[]>([]);
  const [relatives, setRelatives] = useState<LocalRelative[]>([]);
  const [vehicles, setVehicles] = useState<LocalVehicle[]>([]);

  const addRelative = () => {
    setRelatives((prev) => [...prev, createEmptyRelative()]);
  };

  const updateRelative = (
    relativeId: string,
    field: keyof LocalRelative,
    value: string | File[],
  ) => {
    setRelatives((prev) =>
      prev.map((relative) =>
        relative.id === relativeId ? { ...relative, [field]: value } : relative,
      ),
    );
  };

  const removeRelative = (relativeId: string) => {
    setRelatives((prev) =>
      prev.filter((relative) => relative.id !== relativeId),
    );
  };

  const addVehicle = () => {
    setVehicles((prev) => [...prev, createEmptyVehicle()]);
  };

  const updateVehicle = (
    vehicleId: string,
    field: keyof LocalVehicle,
    value: string | File[],
  ) => {
    setVehicles((prev) =>
      prev.map((vehicle) =>
        vehicle.id === vehicleId ? { ...vehicle, [field]: value } : vehicle,
      ),
    );
  };

  const removeVehicle = (vehicleId: string) => {
    setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== vehicleId));
  };

  const resetEntries = () => {
    setTenantAttachments([]);
    setRelatives([]);
    setVehicles([]);
  };

  return {
    tenantAttachments,
    setTenantAttachments,
    relatives,
    addRelative,
    updateRelative,
    removeRelative,
    vehicles,
    addVehicle,
    updateVehicle,
    removeVehicle,
    resetEntries,
  };
}
