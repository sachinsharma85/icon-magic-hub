// Rule-based expiry database for common food items
export interface ExpiryRule {
  keywords: string[];
  daysUntilExpiry: number;
  category: string;
}

export const expiryRules: ExpiryRule[] = [
  // Dairy products
  { keywords: ['milk', 'doodh'], daysUntilExpiry: 3, category: 'Dairy' },
  { keywords: ['curd', 'dahi', 'yogurt', 'yoghurt'], daysUntilExpiry: 5, category: 'Dairy' },
  { keywords: ['paneer', 'cottage cheese'], daysUntilExpiry: 3, category: 'Dairy' },
  { keywords: ['butter', 'ghee'], daysUntilExpiry: 30, category: 'Dairy' },
  { keywords: ['cheese'], daysUntilExpiry: 14, category: 'Dairy' },
  
  // Vegetables
  { keywords: ['tomato', 'tamatar'], daysUntilExpiry: 5, category: 'Vegetables' },
  { keywords: ['potato', 'aloo'], daysUntilExpiry: 14, category: 'Vegetables' },
  { keywords: ['onion', 'pyaz'], daysUntilExpiry: 14, category: 'Vegetables' },
  { keywords: ['carrot', 'gajar'], daysUntilExpiry: 7, category: 'Vegetables' },
  { keywords: ['cabbage', 'patta gobi'], daysUntilExpiry: 7, category: 'Vegetables' },
  { keywords: ['cauliflower', 'phool gobi'], daysUntilExpiry: 5, category: 'Vegetables' },
  { keywords: ['spinach', 'palak'], daysUntilExpiry: 3, category: 'Vegetables' },
  { keywords: ['brinjal', 'baingan', 'eggplant'], daysUntilExpiry: 5, category: 'Vegetables' },
  { keywords: ['capsicum', 'bell pepper', 'shimla mirch'], daysUntilExpiry: 5, category: 'Vegetables' },
  
  // Fruits
  { keywords: ['apple', 'seb'], daysUntilExpiry: 7, category: 'Fruits' },
  { keywords: ['banana', 'kela'], daysUntilExpiry: 3, category: 'Fruits' },
  { keywords: ['orange', 'santara'], daysUntilExpiry: 7, category: 'Fruits' },
  { keywords: ['mango', 'aam'], daysUntilExpiry: 5, category: 'Fruits' },
  { keywords: ['grapes', 'angoor'], daysUntilExpiry: 5, category: 'Fruits' },
  
  // Meat & Fish
  { keywords: ['chicken', 'murgi'], daysUntilExpiry: 2, category: 'Meat' },
  { keywords: ['mutton', 'lamb', 'goat'], daysUntilExpiry: 2, category: 'Meat' },
  { keywords: ['fish', 'machli'], daysUntilExpiry: 1, category: 'Meat' },
  { keywords: ['prawn', 'shrimp', 'jhinga'], daysUntilExpiry: 1, category: 'Meat' },
  
  // Bread & Bakery
  { keywords: ['bread', 'pav'], daysUntilExpiry: 3, category: 'Bakery' },
  { keywords: ['cake'], daysUntilExpiry: 3, category: 'Bakery' },
  
  // Eggs
  { keywords: ['egg', 'anda'], daysUntilExpiry: 14, category: 'Eggs' },
];

export const findExpiryRule = (itemName: string): ExpiryRule | null => {
  const lowerName = itemName.toLowerCase();
  
  for (const rule of expiryRules) {
    if (rule.keywords.some(keyword => lowerName.includes(keyword))) {
      return rule;
    }
  }
  
  return null;
};

export const calculateExpiryDate = (itemName: string, purchaseDate: Date = new Date()): Date => {
  const rule = findExpiryRule(itemName);
  const daysToAdd = rule?.daysUntilExpiry || 7; // Default 7 days if no rule found
  
  const expiryDate = new Date(purchaseDate);
  expiryDate.setDate(expiryDate.getDate() + daysToAdd);
  
  return expiryDate;
};
