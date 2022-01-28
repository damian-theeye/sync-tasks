import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Config } from '../api/config/config';

@Injectable({
  providedIn: 'root'
})
export class RequestService {

  constructor(private http: HttpClient) { }

    login = (email:string, password:string, customer:string|null):Observable<any> => {
      const url = `${Config.api.gateway}/auth/login?customer=${customer}`
      const body = {}
      const headers = {
        'Content-Type': 'application/json', 
        'Accept': 'application/json',
        'Authorization':`Basic ${btoa(`${email}:${password}`)}`
      }

      return this.http.post<any>(url,body,{headers})             

    }

    getTaskList = (accessToken:string, customer:string): Observable<any> => {
      const url = `${Config.api.supervisor}/${customer}/task?unassigned=true&access_token=${accessToken}`
      return this.http.get<any>(url)
    }

    getCredentialData = (accessToken:string):Observable<any> => {
      const url = `${Config.api.gateway}/session/profile?access_token=${accessToken}`
      return this.http.get<any>(url)
    }

    postTask = (accessToken:string, apiMode: string, taskId:string, customer:string, task_arguments:string[]): Observable<any> => {
      const url=`https://${apiMode}.theeye.io/${customer}/task/${taskId}/job?full&access_token=${accessToken}`
      const body={task_arguments}
      const headers = {'Content-Type': 'application/json'}
      return this.http.post<any>(url,body,{headers})
    }

    getTaskResult = (accessToken:string, jobId:string, customer:string): Observable<any> => {
      const url = `${Config.api.supervisor}/${customer}/job/${jobId}?access_token=${accessToken}`
      return this.http.get<any>(url)
    }

}
