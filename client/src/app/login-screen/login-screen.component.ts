import { Component, OnInit} from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../api/session/session.service';
import { TheeyeCredential } from '../common/global-constants';

@Component({
	selector: 'login-screen',
	templateUrl: './login-screen.component.html',
	styleUrls: ['./login-screen.component.less'],
})
export class LoginScreenComponent implements OnInit {

	email:string=''
	password:string=''
	customer:string=''
	errorDiv: string = ''

	constructor(private router: Router, private sessionService: SessionService) { }

	login = () => {
		console.log("Iniciando sesión...")
		this.errorDiv = ''
		this.sessionService.login(this.email, this.password, this.customer)
			.catch((e:any)=> {
				if(e.status === 500) {
					this.errorDiv=e.message
				}
				if(e.status === 403) {
					this.errorDiv = 'Credentials lack privileges for selected customer.'
					console.log('Forbidden')
				}

				if(e.status === 401) {
					this.errorDiv = 'Invalid authentication credentials.'
					console.log('Unauthorized')
				}

				if(e.status === 404) {
					this.errorDiv = 'Gateway is unreachable.'
					console.log('Unreachable')
				}
			})		
	}

	ngOnInit(): void {
		this.sessionService.activeSession.subscribe((data:TheeyeCredential) => {
				if(data.email && data.token) {
					this.router.navigateByUrl("/main-screen");
				}
			}
		)
	}
}
