import { NextResponse } from "next/server";

export async function POST(request: Request) {
try {
const { total } = await request.json();

return NextResponse.json({
id: "DEMO_ORDER_ID",
status: "CREATED",
amount: total,
});
} catch (error) {
return NextResponse.json(
{ error: "Order konnte nicht erstellt werden." },
{ status: 500 }
);
}
}
