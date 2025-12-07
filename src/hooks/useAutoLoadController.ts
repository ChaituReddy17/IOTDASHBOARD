import { useEffect, useRef } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, update, set } from 'firebase/database';
import { toast } from 'sonner';

interface PowerSourceData {
  solar: { percentage: number };
  grid: { percentage: number };
  battery: { percentage: number };
}

interface LoadSettings {
  mode: 'automatic' | 'manual';
  batteryThreshold: number;
  solarThreshold: number;
  gridThreshold: number;
  essentialLoads: any[];
  nonEssentialLoads: any[];
  savePowerActive: boolean;
}

export const useAutoLoadController = () => {
  const lastTriggeredRef = useRef<string | null>(null);

  useEffect(() => {
    let powerSources: PowerSourceData | null = null;
    let loadSettings: LoadSettings | null = null;

    const checkAndSwitchLoads = async () => {
      if (!powerSources || !loadSettings || loadSettings.mode !== 'automatic') {
        return;
      }

      const { battery, solar, grid } = powerSources;
      const { batteryThreshold, solarThreshold, gridThreshold, nonEssentialLoads, savePowerActive } = loadSettings;

      let shouldTurnOffNonEssential = false;
      let triggeredBy = '';

      // Check battery threshold
      if (battery.percentage <= batteryThreshold && battery.percentage > 0) {
        shouldTurnOffNonEssential = true;
        triggeredBy = `battery-${batteryThreshold}`;
      }

      // Check solar threshold (when solar is active power source)
      if (solar.percentage <= solarThreshold && solar.percentage > 0) {
        shouldTurnOffNonEssential = true;
        triggeredBy = `solar-${solarThreshold}`;
      }

      // If we should turn off non-essential and haven't already
      if (shouldTurnOffNonEssential && !savePowerActive && lastTriggeredRef.current !== triggeredBy) {
        lastTriggeredRef.current = triggeredBy;
        
        // Turn off all non-essential loads
        const promises = nonEssentialLoads.map(async (load: any) => {
          const deviceRef = ref(database, `rooms/${load.roomId}/devices/${load.deviceId}`);
          await update(deviceRef, { isOn: false, lastUpdated: Date.now() });
        });

        await Promise.all(promises);
        await set(ref(database, 'loadSettings/savePowerActive'), true);
        
        const source = triggeredBy.split('-')[0];
        toast.warning(`Auto Power Save: ${source} below ${triggeredBy.split('-')[1]}% - Non-essential loads turned off`);
      }

      // Reset when power recovers
      if (!shouldTurnOffNonEssential && savePowerActive) {
        await set(ref(database, 'loadSettings/savePowerActive'), false);
        lastTriggeredRef.current = null;
        toast.success('Power levels recovered - Auto power save deactivated');
      }
    };

    // Listen to power sources
    const powerRef = ref(database, 'powerSources');
    const unsubscribePower = onValue(powerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const totalPower = (data.solar?.current?.generated || 0) + (data.grid?.current?.used || 0);
        powerSources = {
          solar: {
            percentage: totalPower > 0 
              ? Math.round((data.solar?.current?.generated || 0) / totalPower * 100) 
              : 0,
          },
          grid: {
            percentage: totalPower > 0 
              ? Math.round((data.grid?.current?.used || 0) / totalPower * 100) 
              : 0,
          },
          battery: {
            percentage: data.battery?.status?.capacity > 0 
              ? Math.round((data.battery?.status?.currentCharge || 0) / (data.battery?.status?.capacity || 5000) * 100) 
              : 0,
          },
        };
        checkAndSwitchLoads();
      }
    });

    // Listen to load settings
    const settingsRef = ref(database, 'loadSettings');
    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        loadSettings = {
          mode: data.mode || 'manual',
          batteryThreshold: data.batteryThreshold || 40,
          solarThreshold: data.solarThreshold || 20,
          gridThreshold: data.gridThreshold || 10,
          essentialLoads: data.essentialLoads ? Object.values(data.essentialLoads) : [],
          nonEssentialLoads: data.nonEssentialLoads ? Object.values(data.nonEssentialLoads) : [],
          savePowerActive: data.savePowerActive || false,
        };
        checkAndSwitchLoads();
      }
    });

    return () => {
      unsubscribePower();
      unsubscribeSettings();
    };
  }, []);
};
