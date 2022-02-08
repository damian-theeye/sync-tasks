import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../api/session/session.service';
import { RequestService } from '../services/request.service';
import { Select, TheeyeCredential } from '../common/global-constants';

@Component({
  selector: 'app-main-screen',
  templateUrl: './main-screen.component.html',
  styleUrls: ['./main-screen.component.less', './main-screen.component.css']
})
export class MainScreenComponent implements OnInit {

	userEmail:string=''
	userRole:string=''
	userToken:string=''
	userCustomer: string = ''

	taskSelect:Select[]=[]
	modeSelect:Select[]=[
		{id:'sync',name:'API SYNC'},
		{id:'supervisor', name:'SUPERVISOR'}
	]
	inputArguments:string=''
	inputArgumentsArray:string[] = []
	selectedTask:string=''
	selectedMode:string='sync'
	taskResultRaw:string=''
	taskResultOutput:string=''
	taskResult:{attr:string, value:string}[] = []
	selectedTaskName: string = ''
	taskResultInput: string = ''
	showOverlay:boolean=true
	showPretty:boolean=false
	showRaw:boolean=false
	jobId:string=''

	constructor(private sessionService:SessionService, private router:Router, private requestService: RequestService) { }

	getTasks = ():Promise<any> => {
		return new Promise((resolve, reject) => {
			this.requestService.getTaskList(this.userToken, this.userCustomer)
				.subscribe({
					next: data => {
						console.log('getTasks: Fetched res data')
						resolve(data)
					},
					error: error => {
						console.error('getTasks: Error requesting data!')
						reject(error)
					}
				}
			)
		})
	}

	getTaskResult = ():Promise<any> => {
		return new Promise((resolve, reject) => {
			this.requestService.getTaskResult(this.userToken, this.jobId, this.userCustomer)
				.subscribe({
					next: data => {
						console.log('getTaskResult: Fetched res data')
						resolve(data)
					},
					error: error => {
						console.error('getTaskResult: Error requesting data!')
						reject(error)
					}
				}
			)
		})
	}

	getCredentialData = ():Promise<any> => {
		return new Promise((resolve, reject) => {
			this.requestService.getCredentialData(this.userToken)
				.subscribe({
					next: data => {
						console.log('getCredentialData: Fetched res data')
						resolve(data)
					},
					error: error => {
						console.error('getCredentialData: Error requesting data!')
						reject(error)
					}
				}
			)
		})
	}

	taskResultButton = ():void => {
		this.getTaskResult()
			.then((response) => {
				this.taskResultRaw = response
				this.setResultVars(response)
				this.prettifyResult(response)
				this.showOverlay = false
			})
			.catch((e:any) => {
				this.taskResultRaw = e
				this.setResultVars(e.error)
				this.prettifyResult(e)
				this.showOverlay = false
			})
	}

	postTask = ():Promise<any> => {

		this.inputArgumentsArray = this.inputArguments.split(',')
		return new Promise((resolve, reject) => {
			this.requestService.postTask(this.userToken, this.selectedMode, this.selectedTask, this.userCustomer, this.inputArgumentsArray)
				.subscribe({
					next: data => {
						console.log('getFile: Fetched res data')
						resolve(data)
					},
					error: error => {
						console.error('getFile: Error requesting data!')
						reject(error)
					}
				}
			)
		})
	}


	isJsonString = (str:string):boolean=> {
		try {
			JSON.parse(str)
			return true
		} catch (e) {
			return false
		}
	}

	setResultVars = (raw:any):void=> {
		this.taskResultOutput = JSON.stringify((this.isJsonString(raw.output) ? JSON.parse(raw.output) : raw.output), undefined, 2)
		this.taskResultInput = JSON.stringify(this.inputArgumentsArray, undefined, 2)
	}

	prettifyValue = (raw:any):string => {
		if(typeof(raw) === 'object') {
			for(const key in raw) {
				if(this.isJsonString(raw[key])) {
					raw[key] = JSON.parse(raw[key])
				}
			}
		}
		return JSON.stringify(raw, undefined, 2)
	}

	prettifyResult = (raw:any):void => {
		for(const attr of Object.keys(raw)) {
			this.taskResult.push({
				attr:attr,
				value:this.prettifyValue(raw[attr])
			})
		}
	}

	sendReq = ():void => {
		this.jobId =''
		this.showOverlay = true
		this.showPretty=false
		this.showRaw=false
		this.taskResult = []
		this.taskResultRaw = ''

		this.postTask()
			.then((response:any) => {
				const env = (JSON.parse(response.env.THEEYE_JOB))
				this.jobId = env.id
				this.taskResultRaw = response
				this.setResultVars(response)
				this.prettifyResult(response)
				this.showOverlay = false
			})
			.catch((e:any) => {
				this.taskResultRaw = e
				this.setResultVars(e.error)
				this.prettifyResult(e)
				this.showOverlay = false
			})
	}

	onSelectTask = ():void => {
		this.selectedTaskName = this.taskSelect.filter(elem=>elem.id===this.selectedTask)[0].name
	}

	setSelectValues = (data:{id:string, name:string}[] ) => {

		for(const element of data) {
			this.taskSelect.push({
				id:element.id,
				name: element.name
			})
		}

		this.selectedTask=this.taskSelect[0].id
		this.selectedTaskName=this.taskSelect[0].name
		this.showOverlay=false
	}
	
	async ngOnInit(): Promise<void> {
			
		this.sessionService.activeSession.subscribe(async (data:TheeyeCredential) => {
				if(data.credential === null || data.email === null || data.token === null) {
					//Change to login
					this.router.navigateByUrl("/login-screen")
				} else {
					this.userToken = data.token
					this.userEmail = data.email

					if(data.customer) {
						console.log(`Customer set ${data.customer}`)
						this.userCustomer = data.customer
					} else {
						console.log('Fetching default customer')
						this.getCredentialData()
							.then((credentialData:any) => {
								this.userCustomer = credentialData.current_customer.name
							})			
					}
				}
			}
		)

		this.getTasks().then((tasks:any) => {
			this.setSelectValues(tasks)
		})
	}
}
