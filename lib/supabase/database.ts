// Public columns and writable fields granted by the reviewed SQL v2.
// owner_id is deliberately absent: clients must use my_content_ids().
export type SeatShareInsert = {
  line_id: string; current_line_station_id: string; exit_line_station_id: string;
  car_number: number; direction_label: string;
};
export type SeatShareRow = SeatShareInsert & { id: string; created_at: string; expires_at: string };
export type PostInsert = { line_id: string; line_station_id: string | null; category: string; title: string; body: string };
export type PostRow = PostInsert & { id: string; created_at: string; updated_at: string };
export type CommentInsert = { post_id: string; body: string };
export type CommentRow = CommentInsert & { id: string; created_at: string; updated_at: string };
type Source = { id: string; source: string; source_dataset: string; source_code: string; verified_at: string };
export type LineRow = Source & { name: string; color: string | null; color_source: string | null };
export type StationRow = Source & { name: string };
type MembershipRow = Source & { line_id: string; station_id: string; branch_code: string };
export type Database = {
  public: {
    Tables: {
      posts: { Row: PostRow; Insert: PostInsert; Update: PostInsert; Relationships: [] };
      comments: { Row: CommentRow; Insert: CommentInsert; Update: { body: string }; Relationships: [] };
      seat_shares: { Row: SeatShareRow; Insert: SeatShareInsert; Update: never; Relationships: [] };
      lines: { Row: LineRow; Insert: never; Update: never; Relationships: [] };
      stations: { Row: StationRow; Insert: never; Update: never; Relationships: [] };
      line_stations: {
        Row: MembershipRow; Insert: never; Update: never;
        Relationships: [
          { foreignKeyName: "line_stations_line_id_fkey"; columns: ["line_id"]; isOneToOne: false; referencedRelation: "lines"; referencedColumns: ["id"] },
          { foreignKeyName: "line_stations_station_id_fkey"; columns: ["station_id"]; isOneToOne: false; referencedRelation: "stations"; referencedColumns: ["id"] }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: { my_content_ids: { Args: Record<string, never>; Returns: { kind: string; id: string }[] } };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
