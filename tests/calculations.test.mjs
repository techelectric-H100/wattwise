import test from 'node:test';
import assert from 'node:assert/strict';
import { energyKwh, deviceCost, totals, simulateDevice } from '../calculations.mjs';
const ac = {watt:500,hoursPerDay:8,daysPerMonth:30,quantity:1};
test('500W x 8 jam x 30 hari = 120 kWh',()=>assert.equal(energyKwh(ac),120));
test('biaya 120 kWh x 1500 = Rp180.000',()=>assert.equal(deviceCost(ac,1500),180000));
test('jumlah unit, biaya, dan energi akumulatif',()=>{
  const x=totals([ac,{watt:10,hoursPerDay:5,daysPerMonth:30,quantity:2}],1500);
  assert.equal(x.kwh,123);assert.equal(x.cost,184500);assert.equal(x.units,3);
});
test('mengurangi AC 8 menjadi 5 jam hemat Rp67.500',()=>{
  const s=simulateDevice(ac,5,1500);assert.equal(s.saving,67500);assert.equal(s.after,112500);
});
test('durasi yang meningkat memberi nilai penghematan negatif',()=>assert.ok(simulateDevice(ac,10,1500).saving<0));
