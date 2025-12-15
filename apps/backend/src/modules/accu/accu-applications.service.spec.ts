import { AccuApplicationsService } from './accu-applications.service';
import { ACCUStatus, AccuApplication } from '../../entities/accu-application.entity';

describe('AccuApplicationsService - submission deadline event', () => {
  it('calls createSubmissionDeadlineEvent() during submit() when deadline is provided (regression repro)', async () => {
    const accuApplicationRepository: any = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    const calendarEventRepository: any = {
      create: jest.fn((v: any) => v),
      save: jest.fn(async (v: any) => ({ ...v, id: 'evt-1' })),
    };
    const notificationService: any = {
      confirmSubmission: jest.fn(),
    };

    const service = new AccuApplicationsService(
      accuApplicationRepository,
      {} as any, // projectRepository
      {} as any, // documentRepository
      calendarEventRepository,
      {} as any, // userRepository
      notificationService,
    ) as any;

    // Stub private methods that touch DB/other repos
    jest.spyOn(service as any, 'validateSubmissionRequirements').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'createStatusHistory').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'formatApplicationResponse').mockImplementation((a: any) => a);

    const application: Partial<AccuApplication> = {
      id: 'app-1',
      projectId: 'proj-1',
      status: ACCUStatus.DRAFT,
      metadata: {},
      project: { id: 'proj-1', name: 'P', ownerId: 'user-1' } as any,
    };

    accuApplicationRepository.findOne.mockResolvedValue(application);
    accuApplicationRepository.save.mockImplementation(async (a: any) => a);

    const deadline = new Date('2030-01-01T00:00:00.000Z');
    await service.submit('app-1', { submissionNotes: 'n', contactPerson: 'c', deadline });

    expect(notificationService.confirmSubmission).toHaveBeenCalled();
    expect(calendarEventRepository.save).toHaveBeenCalledTimes(1);
  });
});


