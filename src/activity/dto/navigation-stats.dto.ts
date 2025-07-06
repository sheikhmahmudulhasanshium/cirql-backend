import { ApiProperty } from '@nestjs/swagger';
import { MostVisitedPage, NavigationStats } from '../activity.service';

// DTO for a single most visited page entry
class MostVisitedPageDto implements MostVisitedPage {
  @ApiProperty({
    description: 'The URL path of the visited page.',
    example: '/settings',
  })
  url: string;

  @ApiProperty({
    description: 'The number of times the page was visited.',
    example: 42,
  })
  count: number;
}

// Main DTO for the entire navigation stats response
export class NavigationStatsDto implements NavigationStats {
  @ApiProperty({
    description: 'The most recently visited URL by the user.',
    example: '/activity',
    nullable: true,
  })
  lastVisitedUrl: string | null;

  @ApiProperty({
    description: 'A list of the top 5 most frequently visited pages.',
    type: [MostVisitedPageDto],
  })
  mostVisitedPages: MostVisitedPageDto[];
}
