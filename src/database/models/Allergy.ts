import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

export default class Allergy extends Model {
  static table = 'allergies';

  static associations = {
    health_profiles: { type: 'belongs_to', key: 'health_profile_id' },
  } as const;

  @relation('health_profiles', 'health_profile_id') healthProfile: any;
  @field('name') name: any;
  @field('severity') severity: any;
  @field('notes') notes: any;
}
