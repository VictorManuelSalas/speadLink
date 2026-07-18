import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({ selector: 'app-system-message', imports: [RouterLink], template: `<section class="not-found"><span>◈</span><h1>{{ title }}</h1><p>{{ message }}</p><a class="button button--primary" routerLink="/dashboard">Ir al dashboard</a></section>`, changeDetection: ChangeDetectionStrategy.OnPush })
export class SystemMessagePage { private readonly route = inject(ActivatedRoute); readonly title = String(this.route.snapshot.data['title']); readonly message = String(this.route.snapshot.data['message']); }
