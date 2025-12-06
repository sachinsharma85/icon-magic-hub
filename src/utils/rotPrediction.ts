// Rot prediction algorithm based on produce type and storage conditions

export interface StorageConditions {
  temperature: number; // in Celsius
  humidity: number; // percentage
  packaging: 'none' | 'plastic' | 'paper' | 'sealed' | 'refrigerated';
  damage: 'none' | 'minor' | 'moderate' | 'severe';
  ripeness: 'unripe' | 'ripe' | 'overripe';
}

export interface ProduceInfo {
  name: string;
  baseShelfLife: number; // days at optimal conditions
  optimalTemp: number;
  optimalHumidity: number;
  ethyleneProducer: boolean;
  ethyleneSensitive: boolean;
}

export const produceDatabase: Record<string, ProduceInfo> = {
  // Fruits
  apple: { name: 'Apple', baseShelfLife: 30, optimalTemp: 1, optimalHumidity: 90, ethyleneProducer: true, ethyleneSensitive: false },
  banana: { name: 'Banana', baseShelfLife: 7, optimalTemp: 13, optimalHumidity: 90, ethyleneProducer: true, ethyleneSensitive: true },
  orange: { name: 'Orange', baseShelfLife: 21, optimalTemp: 4, optimalHumidity: 90, ethyleneProducer: false, ethyleneSensitive: false },
  mango: { name: 'Mango', baseShelfLife: 10, optimalTemp: 13, optimalHumidity: 90, ethyleneProducer: true, ethyleneSensitive: true },
  grapes: { name: 'Grapes', baseShelfLife: 14, optimalTemp: 0, optimalHumidity: 90, ethyleneProducer: false, ethyleneSensitive: true },
  strawberry: { name: 'Strawberry', baseShelfLife: 5, optimalTemp: 0, optimalHumidity: 95, ethyleneProducer: false, ethyleneSensitive: true },
  watermelon: { name: 'Watermelon', baseShelfLife: 14, optimalTemp: 10, optimalHumidity: 85, ethyleneProducer: false, ethyleneSensitive: true },
  papaya: { name: 'Papaya', baseShelfLife: 7, optimalTemp: 10, optimalHumidity: 90, ethyleneProducer: true, ethyleneSensitive: true },
  pineapple: { name: 'Pineapple', baseShelfLife: 5, optimalTemp: 7, optimalHumidity: 90, ethyleneProducer: false, ethyleneSensitive: false },
  avocado: { name: 'Avocado', baseShelfLife: 7, optimalTemp: 7, optimalHumidity: 90, ethyleneProducer: true, ethyleneSensitive: true },
  
  // Vegetables
  tomato: { name: 'Tomato', baseShelfLife: 7, optimalTemp: 13, optimalHumidity: 90, ethyleneProducer: true, ethyleneSensitive: true },
  potato: { name: 'Potato', baseShelfLife: 30, optimalTemp: 7, optimalHumidity: 95, ethyleneProducer: false, ethyleneSensitive: true },
  onion: { name: 'Onion', baseShelfLife: 30, optimalTemp: 0, optimalHumidity: 65, ethyleneProducer: false, ethyleneSensitive: false },
  carrot: { name: 'Carrot', baseShelfLife: 21, optimalTemp: 0, optimalHumidity: 98, ethyleneProducer: false, ethyleneSensitive: true },
  spinach: { name: 'Spinach', baseShelfLife: 7, optimalTemp: 0, optimalHumidity: 95, ethyleneProducer: false, ethyleneSensitive: true },
  broccoli: { name: 'Broccoli', baseShelfLife: 14, optimalTemp: 0, optimalHumidity: 95, ethyleneProducer: false, ethyleneSensitive: true },
  cucumber: { name: 'Cucumber', baseShelfLife: 10, optimalTemp: 10, optimalHumidity: 95, ethyleneProducer: false, ethyleneSensitive: true },
  capsicum: { name: 'Capsicum', baseShelfLife: 14, optimalTemp: 7, optimalHumidity: 95, ethyleneProducer: false, ethyleneSensitive: true },
  cabbage: { name: 'Cabbage', baseShelfLife: 21, optimalTemp: 0, optimalHumidity: 98, ethyleneProducer: false, ethyleneSensitive: true },
  cauliflower: { name: 'Cauliflower', baseShelfLife: 14, optimalTemp: 0, optimalHumidity: 95, ethyleneProducer: false, ethyleneSensitive: true },
  lettuce: { name: 'Lettuce', baseShelfLife: 7, optimalTemp: 0, optimalHumidity: 98, ethyleneProducer: false, ethyleneSensitive: true },
  eggplant: { name: 'Eggplant', baseShelfLife: 7, optimalTemp: 10, optimalHumidity: 90, ethyleneProducer: false, ethyleneSensitive: true },
};

export interface RotPrediction {
  daysLeft: number;
  rotDate: Date;
  explanation: string;
  factors: {
    temperatureImpact: string;
    humidityImpact: string;
    packagingImpact: string;
    damageImpact: string;
    ripenessImpact: string;
    ethyleneNote: string;
  };
}

export function predictRotDate(
  produceKey: string,
  conditions: StorageConditions
): RotPrediction {
  const produce = produceDatabase[produceKey];
  if (!produce) {
    throw new Error('Unknown produce type');
  }

  let shelfLife = produce.baseShelfLife;
  const factors: RotPrediction['factors'] = {
    temperatureImpact: '',
    humidityImpact: '',
    packagingImpact: '',
    damageImpact: '',
    ripenessImpact: '',
    ethyleneNote: '',
  };

  // Temperature impact
  const tempDiff = Math.abs(conditions.temperature - produce.optimalTemp);
  if (tempDiff <= 2) {
    factors.temperatureImpact = 'Optimal temperature maintained';
  } else if (tempDiff <= 5) {
    shelfLife *= 0.85;
    factors.temperatureImpact = 'Slightly suboptimal temperature (-15% shelf life)';
  } else if (tempDiff <= 10) {
    shelfLife *= 0.65;
    factors.temperatureImpact = 'Poor temperature control accelerates decay (-35% shelf life)';
  } else {
    shelfLife *= 0.4;
    factors.temperatureImpact = 'Extreme temperature stress causes rapid spoilage (-60% shelf life)';
  }

  // Humidity impact
  const humidityDiff = Math.abs(conditions.humidity - produce.optimalHumidity);
  if (humidityDiff <= 5) {
    factors.humidityImpact = 'Ideal humidity level';
  } else if (humidityDiff <= 15) {
    shelfLife *= 0.9;
    factors.humidityImpact = 'Slightly off humidity (-10% shelf life)';
  } else if (humidityDiff <= 30) {
    shelfLife *= 0.75;
    factors.humidityImpact = 'Humidity imbalance promotes microbial growth (-25% shelf life)';
  } else {
    shelfLife *= 0.5;
    factors.humidityImpact = 'Extreme humidity causes rapid deterioration (-50% shelf life)';
  }

  // Packaging impact
  switch (conditions.packaging) {
    case 'refrigerated':
      shelfLife *= 1.2;
      factors.packagingImpact = 'Refrigeration extends freshness (+20% shelf life)';
      break;
    case 'sealed':
      shelfLife *= 1.1;
      factors.packagingImpact = 'Sealed packaging reduces air exposure (+10% shelf life)';
      break;
    case 'plastic':
      shelfLife *= 0.95;
      factors.packagingImpact = 'Plastic may trap moisture (-5% shelf life)';
      break;
    case 'paper':
      factors.packagingImpact = 'Paper allows breathing, neutral impact';
      break;
    case 'none':
      shelfLife *= 0.85;
      factors.packagingImpact = 'No packaging increases air exposure (-15% shelf life)';
      break;
  }

  // Damage impact
  switch (conditions.damage) {
    case 'none':
      factors.damageImpact = 'No physical damage detected';
      break;
    case 'minor':
      shelfLife *= 0.8;
      factors.damageImpact = 'Minor bruising creates entry points for bacteria (-20% shelf life)';
      break;
    case 'moderate':
      shelfLife *= 0.5;
      factors.damageImpact = 'Moderate damage accelerates enzymatic browning (-50% shelf life)';
      break;
    case 'severe':
      shelfLife *= 0.25;
      factors.damageImpact = 'Severe damage causes rapid microbial invasion (-75% shelf life)';
      break;
  }

  // Ripeness impact
  switch (conditions.ripeness) {
    case 'unripe':
      shelfLife *= 1.3;
      factors.ripenessImpact = 'Unripe produce has longer shelf life (+30%)';
      break;
    case 'ripe':
      factors.ripenessImpact = 'Ripe produce at peak freshness window';
      break;
    case 'overripe':
      shelfLife *= 0.4;
      factors.ripenessImpact = 'Overripe stage means rapid deterioration (-60% shelf life)';
      break;
  }

  // Ethylene note
  if (produce.ethyleneProducer) {
    factors.ethyleneNote = `${produce.name} produces ethylene gas which speeds ripening of nearby produce`;
  } else if (produce.ethyleneSensitive) {
    factors.ethyleneNote = `${produce.name} is sensitive to ethylene - keep away from bananas, apples, and tomatoes`;
  } else {
    factors.ethyleneNote = `${produce.name} has low ethylene interaction`;
  }

  // Calculate final values
  const daysLeft = Math.max(1, Math.round(shelfLife));
  const rotDate = new Date();
  rotDate.setDate(rotDate.getDate() + daysLeft);

  // Generate explanation
  const explanation = `Based on ${produce.name}'s natural shelf life of ${produce.baseShelfLife} days under optimal conditions (${produce.optimalTemp}°C, ${produce.optimalHumidity}% humidity), your current storage conditions predict approximately ${daysLeft} days until spoilage. Key factors: ${factors.temperatureImpact}. ${factors.humidityImpact}. ${factors.damageImpact}. ${produce.ethyleneProducer ? 'This produce emits ethylene, accelerating ripening.' : ''} Microbial growth rate increases with temperature deviation and physical damage.`;

  return {
    daysLeft,
    rotDate,
    explanation,
    factors,
  };
}
