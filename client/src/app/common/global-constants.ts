export class GlobalConstants {
    public static runtimeDate: string = String(new Date().getTime())
}

export interface Select {
	id:string,
	name:string
}

export interface TheeyeCredential {
	credential:string, 
	email:string, 
	token:string,
    customer:string
}

export interface Cookie {
	email: string | null
	token: string | null
	credential: string | null
	customer:string | null
}