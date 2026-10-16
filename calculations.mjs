// Rumus terpisah agar mudah diuji tanpa Firebase.
export function energyKwh(device) {
  const { watt, hoursPerDay, daysPerMonth, quantity } = device;
  return (Number(watt) * Number(hoursPerDay) * Number(daysPerMonth) * Number(quantity)) / 1000;
}
export function deviceCost(device, tariff) {
  return energyKwh(device) * Number(tariff);
}
export function totals(devices, tariff) {
  return devices.reduce((acc, device) => {
    acc.kwh += energyKwh(device);
    acc.cost += deviceCost(device, tariff);
    acc.units += Number(device.quantity);
    return acc;
  }, { kwh: 0, cost: 0, units: 0 });
}
export function simulateDevice(device, newHours, tariff) {
  const before = deviceCost(device, tariff);
  const after = deviceCost({ ...device, hoursPerDay: newHours }, tariff);
  return { before, after, saving: before - after };
}
