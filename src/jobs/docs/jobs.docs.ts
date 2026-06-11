import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SystemMessages } from '../../common/constants/system.messages';
import { JobResponseDto } from '../dto/job-response.dto';

export const JobsDocs = {
  CREATE: applyDecorators(
    ApiOperation({ summary: 'Create a new background job' }),
    ApiResponse({
      status: 201,
      description: SystemMessages.JOB_CREATED,
      type: JobResponseDto,
    }),
    ApiResponse({ status: 409, description: SystemMessages.JOB_DUPLICATE }),
    ApiResponse({
      status: 422,
      description: SystemMessages.VALIDATION_ERROR,
    }),
  ),

  FIND_ALL: applyDecorators(
    ApiOperation({ summary: 'Get paginated list of jobs' }),
    ApiResponse({
      status: 200,
      description: SystemMessages.JOBS_FETCHED,
    }),
  ),

  FIND_ONE: applyDecorators(
    ApiOperation({ summary: 'Get a single job by ID' }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: SystemMessages.JOB_FETCHED,
      type: JobResponseDto,
    }),
    ApiResponse({ status: 404, description: SystemMessages.JOB_NOT_FOUND }),
  ),

  UPDATE: applyDecorators(
    ApiOperation({ summary: 'Update a pending job' }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: 'Job updated successfully',
      type: JobResponseDto,
    }),
    ApiResponse({ status: 404, description: SystemMessages.JOB_NOT_FOUND }),
    ApiResponse({
      status: 409,
      description: SystemMessages.JOB_ALREADY_PROCESSING,
    }),
  ),

  CANCEL: applyDecorators(
    ApiOperation({ summary: 'Cancel a pending job' }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: SystemMessages.JOB_CANCELLED,
    }),
    ApiResponse({ status: 404, description: SystemMessages.JOB_NOT_FOUND }),
    ApiResponse({
      status: 409,
      description: SystemMessages.JOB_ALREADY_PROCESSING,
    }),
  ),

  GET_WORKFLOW: applyDecorators(
    ApiOperation({ summary: 'Get job workflow (dependencies and dependents)' }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: SystemMessages.JOB_WORKFLOW_FETCHED,
    }),
    ApiResponse({ status: 404, description: SystemMessages.JOB_NOT_FOUND }),
  ),

  GET_TYPES: applyDecorators(
    ApiOperation({ summary: 'Get all registered job types' }),
    ApiResponse({
      status: 200,
      description: SystemMessages.JOB_TYPES_FETCHED,
    }),
  ),
};
