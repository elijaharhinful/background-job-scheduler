import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobQueryDto } from './dto/job-query.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobResponseDto } from './dto/job-response.dto';
import { JobsDocs } from './docs/jobs.docs';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { SystemMessages } from '../common/constants/system.messages';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @HttpCode(201)
  @JobsDocs.CREATE
  @ResponseMessage(SystemMessages.JOB_CREATED)
  async create(@Body() createJobDto: CreateJobDto): Promise<JobResponseDto> {
    const job = await this.jobsService.create(createJobDto);
    return JobResponseDto.fromEntity(job);
  }

  @Get()
  @JobsDocs.FIND_ALL
  @ResponseMessage(SystemMessages.JOBS_FETCHED)
  async findAll(
    @Query() query: JobQueryDto,
  ): Promise<PaginatedResult<JobResponseDto>> {
    const result = await this.jobsService.findAll(query);
    return {
      ...result,
      data: result.data.map(JobResponseDto.fromEntity),
    };
  }

  @Get('types')
  @JobsDocs.GET_TYPES
  @ResponseMessage(SystemMessages.JOB_TYPES_FETCHED)
  async getTypes(): Promise<string[]> {
    return this.jobsService.getTypes();
  }

  @Get(':id')
  @JobsDocs.FIND_ONE
  @ResponseMessage(SystemMessages.JOB_FETCHED)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobResponseDto> {
    const job = await this.jobsService.findOne(id);
    return JobResponseDto.fromEntity(job);
  }

  @Patch(':id')
  @JobsDocs.UPDATE
  @ResponseMessage('Job updated successfully')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateJobDto: UpdateJobDto,
  ): Promise<JobResponseDto> {
    const job = await this.jobsService.update(id, updateJobDto);
    return JobResponseDto.fromEntity(job);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @JobsDocs.CANCEL
  @ResponseMessage(SystemMessages.JOB_CANCELLED)
  async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.jobsService.cancel(id);
  }

  @Get(':id/workflow')
  @JobsDocs.GET_WORKFLOW
  @ResponseMessage(SystemMessages.JOB_WORKFLOW_FETCHED)
  async getWorkflow(@Param('id', ParseUUIDPipe) id: string): Promise<any> {
    return this.jobsService.getWorkflow(id);
  }
}
