import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-system-message',
  imports: [RouterLink],
  templateUrl: './system-message-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemMessagePage {
  private readonly route = inject(ActivatedRoute);
  readonly title = String(this.route.snapshot.data['title']);
  readonly message = String(this.route.snapshot.data['message']);
}
