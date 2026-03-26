/// <reference types="jest" />

import { agentOrchestrator } from '../AgentOrchestrator';

const mockVisionProcess = jest.fn<any, any[]>(async () => ({
  result: {
    productDetected: true,
    productName: 'Test Product',
    productType: 'food',
  },
}));

jest.mock('../../VisionAgent', () => {
  return {
    VisionAgent: class VisionAgent {
      process(...args: any[]) {
        return mockVisionProcess(...args);
      }
    },
  };
});

jest.mock('../../OCRAgent', () => {
  return {
    OCRAgent: class OCRAgent {
      process = jest.fn(async () => ({
        result: {
          text: 'Ingredients: peanuts sugar',
          ingredients: 'peanuts, sugar',
          nutritionFacts: [{ name: 'Sodium', value: '100mg' }],
        },
      }));
    },
  };
});

jest.mock('../../NutritionAgent', () => {
  return {
    NutritionAgent: class NutritionAgent {
      analyze = jest.fn(async () => ({ flags: { highSodium: true } }));
    },
  };
});

jest.mock('../../AllergyAgent', () => {
  return {
    AllergyAgent: class AllergyAgent {
      process = jest.fn(async () => ({
        result: {
          matchedAllergens: [{ allergen: 'peanuts', severity: 'Severe' }],
        },
      }));
    },
  };
});

jest.mock('../../HealthAdvisorAgent', () => {
  return {
    HealthAdvisorAgent: class HealthAdvisorAgent {
      process = jest.fn(async () => ({
        result: {
          verdict: 'avoid',
          summary: 'Avoid due to severe peanut allergy.',
        },
      }));
    },
  };
});

jest.mock('../../VoiceAgent', () => {
  return {
    VoiceAgent: class VoiceAgent {
      process = jest.fn(async () => ({ result: true }));
    },
  };
});

const mockLogScan = jest.fn<any, any[]>(async (..._args: any[]) => undefined);

jest.mock('../../HealthTrackerAgent', () => {
  return {
    HealthTrackerAgent: {
      logScan: (...args: any[]) => mockLogScan(...args),
    },
  };
});

const mockSevereNotif = jest.fn<any, any[]>(async (..._args: any[]) => undefined);

jest.mock('../../../services/NotificationService', () => {
  return {
    NotificationService: {
      triggerSevereAllergenAlert: (...args: any[]) => mockSevereNotif(...args),
    },
  };
});

describe('AgentOrchestrator (integration)', () => {
  beforeEach(() => {
    mockVisionProcess.mockReset();
    mockVisionProcess.mockImplementation(async () => ({
      result: {
        productDetected: true,
        productName: 'Test Product',
        productType: 'food',
      },
    }));
    mockLogScan.mockClear();
    mockSevereNotif.mockClear();
  });

  it('runs pipeline steps and returns full result (happy path)', async () => {
    const steps: string[] = [];

    const res = await agentOrchestrator.processImage('file://test.jpg', {
      userId: 'u1',
      onStep: (s) => steps.push(s),
    });

    expect(steps[0]).toBe('starting');
    expect(steps).toContain('detecting_product');
    expect(steps).toContain('extracting_text');
    expect(steps).toContain('checking_nutrition');
    expect(steps).toContain('checking_allergies');
    expect(steps).toContain('generating_recommendation');
    expect(steps).toContain('speaking');
    expect(steps).toContain('saving');
    expect(steps[steps.length - 1]).toBe('complete');

    expect(res).toEqual(
      expect.objectContaining({
        userId: 'u1',
        visionResult: expect.objectContaining({ productDetected: true }),
        ocrResult: expect.any(Object),
        nutritionResult: expect.any(Object),
        allergyResult: expect.any(Object),
        recommendation: expect.objectContaining({ verdict: 'avoid' }),
      }),
    );

    expect(mockSevereNotif).toHaveBeenCalledTimes(1);
    expect(mockLogScan).toHaveBeenCalledTimes(1);
  });

  it('returns early when no product is detected', async () => {
    mockVisionProcess.mockImplementation(async () => ({
      result: { productDetected: false },
    }));

    const steps: string[] = [];
    const res = await agentOrchestrator.processImage('file://test.jpg', {
      userId: 'u1',
      onStep: (s) => steps.push(s),
    });

    expect(res).toEqual({ visionResult: { productDetected: false } });
    expect(steps).toContain('complete');
    expect(mockLogScan).not.toHaveBeenCalled();
  });
});
