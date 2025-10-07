import { Component } from '@angular/core';
import { FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../domain/auth.service';
import { AuthResponse } from '../../models/auth.model';

@Component({
  selector: 'app-login-event',
  standalone: true,
  templateUrl: './login-event.component.html',
  styleUrls: ['./login-event.component.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule]
})
export class LoginEventComponent {
  showPassword = false;
  loading = false;
  authError = false;
  submitted = false;

  get showAuthError(): boolean {
    return this.authError || (this.submitted && this.form.invalid);
  }

  form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    remember: [false]
  });

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) { }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.invalid && this.submitted);
  }

  onSubmit() {
    this.authError = false;
    this.submitted = true;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const { username, password, remember } = this.form.value;

    this.authService.login({ username: username!, password: password! })
      .subscribe({
        next: (res: any) => {
          this.loading = false;

          if (res?.bearerToken) {
            const token = res.bearerToken;
            const user = res.user;

            if (remember) {
              localStorage.setItem('auth_token', token);
            } else {
              sessionStorage.setItem('auth_token', token);
            }

            localStorage.setItem('username', user.username);
            localStorage.setItem('role', user.role);

            this.router.navigate(['/manage-events']);
          } else {
            this.authError = true;
          }
        },
        error: (err: unknown) => {
          console.error('Login error:', err);
          this.authError = true;
          this.loading = false;
        }
      });

  }
}

