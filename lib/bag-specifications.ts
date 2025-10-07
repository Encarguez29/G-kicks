export interface BagSpecification {
  size: 'Small' | 'Medium' | 'Large';
  maxWeight: number; // in kg
  description: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export const bagSpecifications: BagSpecification[] = [
  {
    size: 'Small',
    maxWeight: 3,
    description: 'Suitable for 1-3 items',
    dimensions: {
      length: 30,
      width: 20,
      height: 15
    }
  },
  {
    size: 'Medium',
    maxWeight: 5,
    description: 'Suitable for 4-6 items',
    dimensions: {
      length: 40,
      width: 30,
      height: 20
    }
  },
  {
    size: 'Large',
    maxWeight: 8,
    description: 'Suitable for 7-10 items',
    dimensions: {
      length: 50,
      width: 40,
      height: 25
    }
  }
];

/**
 * Calculate the recommended bag size based on cart items
 * @param itemCount Number of items in cart
 * @param totalWeight Total weight of items (optional)
 * @returns Recommended bag specification
 */
export function getRecommendedBagSize(itemCount: number, totalWeight?: number): BagSpecification {
  // If weight is provided, use it as primary factor
  if (totalWeight) {
    if (totalWeight <= 3) return bagSpecifications[0]; // Small
    if (totalWeight <= 5) return bagSpecifications[1]; // Medium
    return bagSpecifications[2]; // Large
  }

  // Otherwise, use item count
  if (itemCount <= 2) return bagSpecifications[0]; // Small
  if (itemCount <= 4) return bagSpecifications[1]; // Medium
  return bagSpecifications[2]; // Large
}

/**
 * Get all bag specifications
 * @returns Array of all bag specifications
 */
export function getAllBagSpecifications(): BagSpecification[] {
  return bagSpecifications;
}

/**
 * Get bag specification by size
 * @param size Bag size
 * @returns Bag specification or undefined if not found
 */
export function getBagSpecificationBySize(size: 'Small' | 'Medium' | 'Large'): BagSpecification | undefined {
  return bagSpecifications.find(spec => spec.size === size);
}