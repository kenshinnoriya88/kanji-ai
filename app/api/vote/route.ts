import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { restaurantId } = await request.json();

  const { data: restaurant, error: fetchError } = await supabase
    .from("restaurants")
    .select("votes")
    .eq("id", restaurantId)
    .single();

  if (fetchError || !restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("restaurants")
    .update({ votes: restaurant.votes + 1 })
    .eq("id", restaurantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
