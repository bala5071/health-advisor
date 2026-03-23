import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

export default class Medication extends Model {
  static table = 'medications';

  static associations = {
    health_profiles: { type: 'belongs_to', key: 'health_profile_id' },
  } as const;

  @relation('health_profiles', 'health_profile_id') healthProfile: any;
  @field('name') name: any;
  @field('dosage') dosage: any;
  @field('frequency') frequency: any;
  @field('notes') notes: any;
}
