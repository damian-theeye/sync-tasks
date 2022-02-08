import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Cookie } from 'src/app/common/global-constants';
import { RequestService } from 'src/app/services/request.service';

import {Config} from '../config/config';


@Injectable({
  providedIn: 'root'
})
export class SessionService {

	private sessionCookie: Cookie = {
		email: null,
		token: null,
		credential: null,
		customer:null
	}

	private customer:string = Config.api.customer

	activeSession = new Observable<any>(sessionObservable => {
		let previousStream: Cookie
		sessionObservable.next(this.sessionCookie)
		setInterval(() => { 
			if (previousStream !== this.sessionCookie){
				sessionObservable.next(this.sessionCookie)
				previousStream = this.sessionCookie
			}
		}, 1000)
	});
	
	constructor(private requestService:RequestService) {
		this.refreshLogin()
	}

	getLoginData = (email:string, password:string, customer:string | null):Promise<any> => {
		return new Promise((resolve, reject) => {
			// Se le puede pasar this.customer en caso de que sea customer fijo por config
			this.requestService.login(email,password,customer)
				.subscribe({
					next: data => {
						// console.log('getLoginData: Fetched res data')
						resolve(data)
					},
					error: error => {
						// console.error('getLoginData: Error requesting data!')
						this.logout()
						reject(error)
					}
				}
			)
		})
	}

	login = (email: string, password: string, customer:string | null):Promise<void> => {
		return new Promise((resolve, reject) => {
			if (email && password) {
					this.getLoginData(email, password, customer || localStorage.getItem('customer'))
					.then((credentialsData) => {
						this.sessionCookie = {
							email: email,
							token: credentialsData.access_token,
							credential: credentialsData.credential,
							customer: customer
						}
						resolve(this.store())
					}).catch(e=> {
						reject(e)
					})
			} else {
				reject({message:'Username or password is blank.', status:500})
			}
		})
		
	}

	logout = () => {
		this.sessionCookie = {
			email:null,
			credential:null,
			token:null,
			customer: localStorage.getItem('customer')
		}
		localStorage.removeItem('isLogged')
	}

	private store() {
		if(this.sessionCookie) {
			localStorage.setItem('isLogged', 'true');
			for (const [key, value] of Object.entries(this.sessionCookie)) {
  				localStorage.setItem(key, value)
			}
		}
	}

	refreshLogin = () => {
		if(localStorage.getItem('isLogged') === 'true') {
			this.sessionCookie = {
				email: localStorage.getItem('email') || null,
				token: localStorage.getItem('token') || null,
				credential: localStorage.getItem('credential') || null,
				customer: localStorage.getItem('customer') || null
			}
		}
	}
}
