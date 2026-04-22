export type ExperimentStatus = "draft" | "live" | "concluded";
export type VariantType = "control" | "treatment";
export type KnownPageSection =
  | "hero"
  | "images"
  | "purchase"
  | "trust"
  | "social_proof"
  | "recommendations"
  | "layout";
export type PageSection = KnownPageSection | (string & {});

export interface ProductGalleryItem {
  id: string;
  label: string;
  accent: string;
  panel_class_name: string;
  orb_class_name: string;
}

export interface ProductOptionGroup {
  id: string;
  label: string;
  values: string[];
  selected_value: string;
  helper_text?: string;
}

export interface ProductQuantitySelector {
  label: string;
  helper_text: string;
  min: number;
  max: number;
}

export interface ProductTrustItem {
  title: string;
  detail?: string;
}

export interface ProductReview {
  name: string;
  rating_label: string;
  body: string;
}

export interface ProductRecommendation {
  name: string;
  description: string;
  price_cents: number;
  panel_class_name: string;
}

export interface ProductStorefrontContent {
  template_key: string;
  hero_kicker: string;
  primary_cta_label: string;
  sticky_cta_label?: string;
  gallery_items: ProductGalleryItem[];
  option_groups: ProductOptionGroup[];
  quantity_selector: ProductQuantitySelector;
  trust_items: ProductTrustItem[];
  reviews_heading: string;
  reviews_subheading: string;
  reviews: ProductReview[];
  recommendations_heading: string;
  recommendations_subheading: string;
  recommendations: ProductRecommendation[];
}

export interface Product {
  id: string;
  slug: string;
  brand: string;
  category_label: string;
  name: string;
  description: string;
  price_cents: number;
  rating: number;
  review_count: number;
  status: "active" | "archived";
  storefront: ProductStorefrontContent;
  created_at: string;
}

export interface CreateExperimentInput {
  user_id: string;
  product_id: string;
  name: string;
  hypothesis: string;
  product_context?: string;
  success_metric?: string;
}

export interface Experiment {
  id: string;
  user_id: string;
  product_id: string;
  name: string;
  hypothesis: string;
  product_context?: string;
  success_metric: string;
  status: ExperimentStatus;
  winner?: VariantType;
  created_at: string;
}

export interface Variant {
  id: string;
  experiment_id: string;
  type: VariantType;
  target_region: PageSection;
  html: string;
  rationale: string;
  created_at: string;
}

export interface Visit {
  id: string;
  experiment_id: string;
  variant_type: VariantType;
  visitor_id: string;
  converted: boolean;
  created_at: string;
}

export interface ExperimentStats {
  control: { visits: number; conversions: number; cvr: number };
  treatment: { visits: number; conversions: number; cvr: number };
}

export interface ExperimentTimelinePoint {
  label: string;
  controlCvr: number;
  treatmentCvr: number;
}

export interface ExperimentDashboardStats {
  stats: ExperimentStats;
  confidence: number;
  totalVisitors: number;
  totalConversions: number;
  upliftPercentage: number;
  timeline: ExperimentTimelinePoint[];
}

export interface PublicExperimentBundle {
  experiment: Experiment;
  control: Variant;
  treatment: Variant;
}

export type DashboardBadgeStatus = "live" | "winner" | "draft" | "concluded";

export interface DashboardExperimentCardData {
  experiment: Experiment;
  product: Product;
  stats: ExperimentStats | null;
  totalVisitors: number;
  daysRunning: number;
  upliftPercentage: number;
  badgeStatus: DashboardBadgeStatus;
}

export interface GeneratedTreatmentCandidate {
  id: string;
  label: string;
  html: string;
  rationale: string;
}

export interface VariantGenerationResult {
  target_region: PageSection;
  hypothesis_interpretation: string;
  scope_description: string;
  control: { html: string; rationale: string };
  treatments: GeneratedTreatmentCandidate[];
  treatment: { html: string; rationale: string };
}

export interface ExperimentSummaryHistoryItem {
  experiment_id: string;
  experiment_name: string;
  hypothesis: string;
  product_name: string;
  product_slug: string;
  status: Extract<ExperimentStatus, "live" | "concluded">;
  target_region: PageSection;
  created_at: string;
  winner?: VariantType;
  total_visitors: number;
  total_conversions: number;
  control_cvr: number;
  treatment_cvr: number;
  uplift_percentage: number;
  confidence: number;
}

export interface ExperimentSummaryContext extends ExperimentSummaryHistoryItem {
  control_visits: number;
  control_conversions: number;
  treatment_visits: number;
  treatment_conversions: number;
  control_rationale: string;
  treatment_rationale: string;
}

export interface ExperimentSummaryRecommendation {
  title: string;
  rationale: string;
  hypothesis: string;
  priority: "high" | "medium" | "low";
}

export interface ExperimentSummaryReport {
  headline: string;
  summary: string;
  findings: string[];
  recommendations: ExperimentSummaryRecommendation[];
}

export class VariantGenerationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "VariantGenerationError";
  }
}

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          slug: string;
          brand: string;
          category_label: string;
          name: string;
          description: string;
          price_cents: number;
          rating: number;
          review_count: number;
          status: "active" | "archived";
          storefront: ProductStorefrontContent;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          brand: string;
          category_label: string;
          name: string;
          description: string;
          price_cents: number;
          rating?: number;
          review_count?: number;
          status?: "active" | "archived";
          storefront?: ProductStorefrontContent;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          brand?: string;
          category_label?: string;
          name?: string;
          description?: string;
          price_cents?: number;
          rating?: number;
          review_count?: number;
          status?: "active" | "archived";
          storefront?: ProductStorefrontContent;
          created_at?: string;
        };
        Relationships: [];
      };
      experiments: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          name: string;
          hypothesis: string;
          product_context: string | null;
          success_metric: string;
          status: ExperimentStatus;
          winner: VariantType | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          name: string;
          hypothesis: string;
          product_context?: string | null;
          success_metric?: string;
          status?: ExperimentStatus;
          winner?: VariantType | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          name?: string;
          hypothesis?: string;
          product_context?: string | null;
          success_metric?: string;
          status?: ExperimentStatus;
          winner?: VariantType | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "experiments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "experiments_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      variants: {
        Row: {
          id: string;
          experiment_id: string;
          type: VariantType;
          target_region: PageSection;
          html: string;
          rationale: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          experiment_id: string;
          type: VariantType;
          target_region?: PageSection;
          html: string;
          rationale?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          experiment_id?: string;
          type?: VariantType;
          target_region?: PageSection;
          html?: string;
          rationale?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "variants_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: false;
            referencedRelation: "experiments";
            referencedColumns: ["id"];
          },
        ];
      };
      visits: {
        Row: {
          id: string;
          experiment_id: string;
          variant_type: VariantType;
          visitor_id: string;
          converted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          experiment_id: string;
          variant_type: VariantType;
          visitor_id: string;
          converted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          experiment_id?: string;
          variant_type?: VariantType;
          visitor_id?: string;
          converted?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "visits_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: false;
            referencedRelation: "experiments";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
