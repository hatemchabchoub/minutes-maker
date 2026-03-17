import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  parentPvId: string;
  onChangeParentPvId: (id: string) => void;
}

export default function ParentPvSelector({ parentPvId, onChangeParentPvId }: Props) {
  const { data: parentPvs } = useQuery({
    queryKey: ["parent-pvs-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pv")
        .select("id, pv_number, internal_reference, pv_date")
        .eq("pv_type", "محضر")
        .is("parent_pv_id", null)
        .order("pv_number", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  return (
    <div className="space-y-2">
      <Label>المحضر الأصلي (الأب) *</Label>
      <Select value={parentPvId} onValueChange={onChangeParentPvId}>
        <SelectTrigger><SelectValue placeholder="اختر المحضر الأصلي" /></SelectTrigger>
        <SelectContent>
          {parentPvs?.map(p => (
            <SelectItem key={p.id} value={p.id}>
              {p.pv_number} — {p.internal_reference} ({p.pv_date})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
