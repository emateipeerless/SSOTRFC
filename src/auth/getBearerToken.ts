import { msal } from "./microsoft";
import type { AuthSession } from "./types.ts";

export async function getBearerToken(session: AuthSession): Promise<string> {
    if(session.provider === "google"){
        if(!session.idToken) throw new Error("Missing Google ID Token");
        return session.idToken;
    }
    if(session.provider === "local"){
        if(!session.idToken) throw new Error("Missing Google ID Token");
        return session.idToken;
    }

    //microsoft pull idtoken from MSAL cache
    const acct = msal.getActiveAccount() ?? msal.getAllAccounts()[0];
    if(!acct) throw new Error("No MSAL ACCOUNT");

    const res = await msal.acquireTokenSilent({
        account:acct,
        scopes:["openid","profile","email"],
    });
    if(!res.idToken) throw new Error("MISSING MICROSOFT idToken");
    return res.idToken;
}