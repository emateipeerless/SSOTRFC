import type { AuthSession } from "../auth/types";
import { getBearerToken } from "../auth/getBearerToken";

const API_BASE = import.meta.env.VITE_API_BASE;

export async function syncMe(session: AuthSession): Promise<void>{
    const token = await getBearerToken(session);

    const res =await fetch(`${API_BASE}me/sync`,{
        method:"POST",
        headers:{
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body:JSON.stringify({}), //body unused identity from token
    });
if(!res.ok){
    const txt = await res.text();
    throw new Error(`syncMe FAILED: ${res.status} ${txt}`);
}

}