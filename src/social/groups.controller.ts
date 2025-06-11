// FILE: src/social/groups.controller.ts
import { Controller } from '@nestjs/common';
import { GroupsService } from './groups.service';

@Controller('social/groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}
  // Add endpoints for creating groups, joining, leaving, etc.
}
