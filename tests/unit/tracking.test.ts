import { beforeEach, describe, expect, it, vi } from "vitest";

const insertMock = vi.fn();
const selectMock = vi.fn();
const updateMock = vi.fn();
const eqMock = vi.fn();
const orderMock = vi.fn();
const limitMock = vi.fn();
const maybeSingleMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase-admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "visits") {
        return {
          insert: insertMock,
          select: selectMock,
          update: updateMock,
        };
      }

      return {
        insert: insertMock,
        select: selectMock,
        update: updateMock,
      };
    }),
  })),
}));

describe("tracking helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    eqMock.mockReturnThis();
    orderMock.mockReturnThis();
    limitMock.mockReturnThis();
  });

  it("logVisit creates a record with the correct variant type", async () => {
    insertMock.mockResolvedValueOnce({ error: null });
    const { logVisit } = await import("../../lib/tracking");

    await logVisit("experiment-1", "control", "visitor-1");

    expect(insertMock).toHaveBeenCalledWith({
      experiment_id: "experiment-1",
      variant_type: "control",
      visitor_id: "visitor-1",
    });
  });

  it("getExperimentStats returns correct CVR per variant", async () => {
    selectMock.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            id: "1",
            experiment_id: "experiment-1",
            variant_type: "control",
            visitor_id: "a",
            converted: true,
            created_at: "2026-03-26T10:00:00.000Z",
          },
          {
            id: "2",
            experiment_id: "experiment-1",
            variant_type: "control",
            visitor_id: "b",
            converted: false,
            created_at: "2026-03-26T10:30:00.000Z",
          },
          {
            id: "3",
            experiment_id: "experiment-1",
            variant_type: "treatment",
            visitor_id: "c",
            converted: true,
            created_at: "2026-03-26T11:00:00.000Z",
          },
          {
            id: "4",
            experiment_id: "experiment-1",
            variant_type: "treatment",
            visitor_id: "d",
            converted: true,
            created_at: "2026-03-26T11:30:00.000Z",
          },
        ],
        error: null,
      }),
    });
    const { getExperimentStats } = await import("../../lib/tracking");
    const stats = await getExperimentStats("experiment-1");

    expect(stats).toEqual({
      control: { visits: 2, conversions: 1, cvr: 0.5 },
      treatment: { visits: 2, conversions: 2, cvr: 1 },
    });
  });

  it("getExperimentStats matches known fixture data", async () => {
    selectMock.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            id: "1",
            experiment_id: "experiment-2",
            variant_type: "control",
            visitor_id: "a",
            converted: false,
            created_at: "2026-03-26T10:00:00.000Z",
          },
          {
            id: "2",
            experiment_id: "experiment-2",
            variant_type: "control",
            visitor_id: "b",
            converted: false,
            created_at: "2026-03-26T10:10:00.000Z",
          },
          {
            id: "3",
            experiment_id: "experiment-2",
            variant_type: "treatment",
            visitor_id: "c",
            converted: true,
            created_at: "2026-03-26T10:20:00.000Z",
          },
        ],
        error: null,
      }),
    });
    const { getExperimentStats } = await import("../../lib/tracking");
    const stats = await getExperimentStats("experiment-2");

    expect(stats.control.cvr).toBe(0);
    expect(stats.treatment.cvr).toBe(1);
  });

  it("getExperimentStats returns 0 instead of NaN or Infinity for zero visits", async () => {
    selectMock.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    });
    const { getExperimentStats } = await import("../../lib/tracking");
    const stats = await getExperimentStats("experiment-3");

    expect(stats.control.cvr).toBe(0);
    expect(stats.treatment.cvr).toBe(0);
  });
});
