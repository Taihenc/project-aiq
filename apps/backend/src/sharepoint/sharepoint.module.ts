import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SharePointService } from './sharepoint.service';
import { SharePointController } from './sharepoint.controller';

@Module({
  imports: [HttpModule],
  providers: [SharePointService],
  controllers: [SharePointController],
  exports: [SharePointService],
})
export class SharePointModule { }
