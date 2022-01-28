import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
  Router,
  Event as RouterEvent,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError
} from '@angular/router'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit{


  public showOverlay = true;

	constructor(private router:Router){
  }
  title = 'TheEye'
    
  ngOnInit() {

    // Change to login
	this.router.navigateByUrl("/login-screen");

  }
}
