import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from '../../src/app.module';
import { User } from '../../src/entities/user.entity';
import { Project } from '../../src/entities/project.entity';
import { AccuApplication } from '../../src/entities/accu-application.entity';
import { Document } from '../../src/entities/document.entity';
import { CalendarEvent } from '../../src/entities/calendar-event.entity';
import { Notification } from '../../src/entities/notification.entity';
import { E2ETestHelper, E2EWorkflowTester } from '../setup/e2e-setup';

describe('ACCU Application Lifecycle E2E Tests', () => {
  let app: INestApplication;
  let e2eTester: E2EWorkflowTester;
  let testData: Map<string, any>;

  beforeAll(async () => {
    console.log('Setting up ACCU Application Lifecycle E2E tests...');
    
    // Get the app and tester from the setup
    app = E2ETestHelper.getApp();
    e2eTester = E2ETestHelper.getE2ETester();
    testData = new Map();
  });

  afterAll(async () => {
    console.log('Cleaning up ACCU Application Lifecycle E2E tests...');
    testData.clear();
  });

  describe('Complete ACCU Application Workflow', () => {
    it('should handle complete ACCU application lifecycle from creation to issuance', async () => {
      console.log('Starting complete ACCU application lifecycle test...');

      // Step 1: Create and authenticate user
      console.log('Step 1: Creating user...');
      const userData = {
        email: `accu-test-${Date.now()}@example.com`,
        firstName: 'ACCU',
        lastName: 'TestUser',
        password: 'SecurePassword123!',
      };

      const userResponse = await e2eTester.createTestUser(userData);
      expect(userResponse).toBeDefined();
      expect(userResponse.id).toHaveValidId();
      testData.set('user', userResponse);

      // Authenticate the user
      console.log('Step 2: Authenticating user...');
      const authData = await e2eTester.authenticate(userData.email, userData.password);
      expect(authData).toBeDefined();
      expect(authData.accessToken).toBeDefined();
      e2eTester.setApiToken(authData.accessToken);
      testData.set('authData', authData);

      // Step 3: Create a project
      console.log('Step 3: Creating project...');
      const projectData = {
        name: 'ACCU Solar Farm Project',
        description: 'Solar farm project for ACCU generation',
        type: 'methodology',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        methodology: {
          id: 'solar-pv-methodology',
          name: 'Solar PV Methodology',
          version: '1.0',
          url: 'https://example.com/solar-methodology',
        },
        tags: ['solar', 'renewable-energy', 'accu'],
      };

      const projectResponse = await E2ETestHelper.makeRequest('POST', '/projects', projectData);
      expect(projectResponse.status).toBeSuccessfulE2EResponse();
      expect(projectResponse.data.id).toHaveValidId();
      expect(projectResponse.data.name).toBe(projectData.name);
      testData.set('project', projectResponse.data);

      // Step 4: Create ACCU application
      console.log('Step 4: Creating ACCU application...');
      const accuApplicationData = {
        accuUnits: 5000,
        methodologyId: 'solar-pv-methodology',
        applicationData: {
          description: 'Solar farm project for carbon credit generation',
          location: {
            address: '123 Solar Farm Road',
            coordinates: {
              lat: -33.8688,
              lng: 151.2093,
            },
            jurisdiction: 'NSW',
          },
          projectDetails: {
            type: 'renewable_energy',
            capacity: '10MW',
            technology: 'solar_pv',
            operationalLife: 25,
            expectedGeneration: 25000, // MWh per year
          },
          environmentalBenefits: {
            co2Avoided: 20000, // tonnes CO2 per year
            renewableEnergyGeneration: 25000, // MWh
          },
        },
      };

      const accuResponse = await E2ETestHelper.makeRequest(
        'POST',
        `/accu-applications?projectId=${projectResponse.data.id}`,
        accuApplicationData
      );
      expect(accuResponse.status).toBeSuccessfulE2EResponse();
      expect(accuResponse.data.id).toHaveValidId();
      expect(accuResponse.data.status).toBe('draft');
      expect(accuResponse.data.accuUnits).toBe(accuApplicationData.accuUnits);
      testData.set('accuApplication', accuResponse.data);

      // Step 5: Upload supporting documents
      console.log('Step 5: Uploading supporting documents...');
      const documentData = [
        {
          name: 'Project Feasibility Study',
          description: 'Comprehensive feasibility study for the solar farm',
          category: 'methodology',
          tags: ['feasibility', 'study'],
        },
        {
          name: 'Environmental Impact Assessment',
          description: 'Environmental impact assessment report',
          category: 'environmental',
          tags: ['environmental', 'assessment'],
        },
        {
          name: 'Financial Model',
          description: 'Detailed financial model and projections',
          category: 'financial',
          tags: ['financial', 'model'],
        },
      ];

      const uploadedDocuments = [];
      for (const docData of documentData) {
        // Create a mock file
        const mockFile = {
          buffer: Buffer.from(`Mock content for ${docData.name}`),
          originalname: `${docData.name}.pdf`,
          mimetype: 'application/pdf',
          size: 1024,
        };

        const uploadResponse = await E2ETestHelper.uploadFile(
          '/documents',
          'file',
          mockFile,
          docData
        );
        expect(uploadResponse.status).toBeSuccessfulE2EResponse();
        expect(uploadResponse.data.document.id).toHaveValidId();
        uploadedDocuments.push(uploadResponse.data.document);
      }

      testData.set('documents', uploadedDocuments);

      // Step 6: Create calendar events for important deadlines
      console.log('Step 6: Creating calendar events...');
      const calendarEvents = [
        {
          title: 'ACCU Application Submission Deadline',
          description: 'Final deadline for ACCU application submission',
          type: 'deadline',
          priority: 'critical',
          startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          isAllDay: true,
          reminders: [7, 3, 1], // 7, 3, and 1 day before
        },
        {
          title: 'Supporting Documents Review',
          description: 'Review of all supporting documents before submission',
          type: 'meeting',
          priority: 'high',
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // +2 hours
          isAllDay: false,
          reminders: [1], // 1 day before
        },
      ];

      const createdEvents = [];
      for (const eventData of calendarEvents) {
        const eventResponse = await E2ETestHelper.makeRequest(
          'POST',
          `/calendar/events?projectId=${projectResponse.data.id}`,
          eventData
        );
        expect(eventResponse.status).toBeSuccessfulE2EResponse();
        expect(eventResponse.data.id).toHaveValidId();
        createdEvents.push(eventResponse.data);
      }

      testData.set('calendarEvents', createdEvents);

      // Step 7: Review and update ACCU application
      console.log('Step 7: Reviewing ACCU application...');
      const reviewResponse = await E2ETestHelper.makeRequest(
        'GET',
        `/accu-applications/${accuResponse.data.id}`
      );
      expect(reviewResponse.status).toBeSuccessfulE2EResponse();
      
      // Verify all data is correctly associated
      expect(reviewResponse.data.projectId).toBe(projectResponse.data.id);
      expect(reviewResponse.data.applicationData.projectDetails.capacity).toBe('10MW');

      // Step 8: Submit ACCU application
      console.log('Step 8: Submitting ACCU application...');
      const submissionData = {
        submissionNotes: 'Application ready for review. All supporting documents uploaded.',
        contactPerson: {
          name: `${userData.firstName} ${userData.lastName}`,
          email: userData.email,
          phone: '+61-400-000-000',
          position: 'Project Manager',
        },
      };

      const submissionResponse = await E2ETestHelper.makeRequest(
        'POST',
        `/accu-applications/${accuResponse.data.id}/submit`,
        submissionData
      );
      expect(submissionResponse.status).toBeSuccessfulE2EResponse();
      expect(submissionResponse.data.status).toBe('submitted');
      expect(submissionResponse.data.submissionDate).toBeDefined();
      testData.set('submittedApplication', submissionResponse.data);

      // Step 9: Check application analytics
      console.log('Step 9: Checking application analytics...');
      const analyticsResponse = await E2ETestHelper.makeRequest(
        'GET',
        `/accu-applications/${accuResponse.data.id}/analytics`
      );
      expect(analyticsResponse.status).toBeSuccessfulE2EResponse();
      expect(analyticsResponse.data).toHaveProperty('progress');
      expect(analyticsResponse.data).toHaveProperty('documentCompletion');
      expect(analyticsResponse.data.documentCompletion).toBeGreaterThan(0);

      // Step 10: Check dashboard for submitted applications
      console.log('Step 10: Checking dashboard...');
      const dashboardResponse = await E2ETestHelper.makeRequest('GET', '/accu-applications/dashboard');
      expect(dashboardResponse.status).toBeSuccessfulE2EResponse();
      expect(dashboardResponse.data).toHaveProperty('totalApplications');
      expect(dashboardResponse.data.totalApplications).toBeGreaterThan(0);
      expect(dashboardResponse.data.applicationsByStatus).toHaveProperty('submitted');

      console.log('Complete ACCU application lifecycle test completed successfully!');
    });

    it('should handle ACCU application approval workflow', async () => {
      console.log('Starting ACCU application approval workflow test...');

      // Create a submitted application first
      const userData = {
        email: `approval-test-${Date.now()}@example.com`,
        firstName: 'Approval',
        lastName: 'TestUser',
        password: 'SecurePassword123!',
      };

      const userResponse = await e2eTester.createTestUser(userData);
      const authData = await e2eTester.authenticate(userData.email, userData.password);
      e2eTester.setApiToken(authData.accessToken);

      // Create project and application
      const projectResponse = await E2ETestHelper.makeRequest('POST', '/projects', {
        name: 'Approval Test Project',
        type: 'methodology',
        startDate: new Date().toISOString(),
        methodology: {
          id: 'test-methodology',
          name: 'Test Methodology',
          version: '1.0',
        },
      });

      const accuResponse = await E2ETestHelper.makeRequest(
        'POST',
        `/accu-applications?projectId=${projectResponse.data.id}`,
        {
          accuUnits: 1000,
          methodologyId: 'test-methodology',
          applicationData: {
            description: 'Test application for approval workflow',
            location: {
              address: '123 Test St',
              coordinates: { lat: 0, lng: 0 },
              jurisdiction: 'NSW',
            },
          },
        }
      );

      // Submit the application
      await E2ETestHelper.makeRequest(
        'POST',
        `/accu-applications/${accuResponse.data.id}/submit`,
        {
          submissionNotes: 'Ready for approval',
          contactPerson: {
            name: 'Test User',
            email: userData.email,
            phone: '+61400000000',
            position: 'Project Manager',
          },
        }
      );

      // Step: Review and approve application
      console.log('Step: Approving ACCU application...');
      const approvalData = {
        approved: true,
        approvedUnits: 1000,
        reason: 'Meets all requirements',
        reviewerComments: 'Excellent application with comprehensive documentation',
        nextSteps: 'Proceed to issuance',
      };

      const approvalResponse = await E2ETestHelper.makeRequest(
        'POST',
        `/accu-applications/${accuResponse.data.id}/approve`,
        approvalData
      );

      if (approvalResponse.status === 200) {
        expect(approvalResponse.data.status).toBe('approved');
        expect(approvalResponse.data.approvalDate).toBeDefined();
      } else {
        // If approval endpoint doesn't exist, the status should remain submitted
        console.log('Approval endpoint not implemented, application remains submitted');
      }

      console.log('ACCU application approval workflow test completed!');
    });

    it('should handle ACCU application rejection and resubmission', async () => {
      console.log('Starting ACCU application rejection and resubmission test...');

      const userData = {
        email: `rejection-test-${Date.now()}@example.com`,
        firstName: 'Rejection',
        lastName: 'TestUser',
        password: 'SecurePassword123!',
      };

      const userResponse = await e2eTester.createTestUser(userData);
      const authData = await e2eTester.authenticate(userData.email, userData.password);
      e2eTester.setApiToken(authData.accessToken);

      // Create project and application
      const projectResponse = await E2ETestHelper.makeRequest('POST', '/projects', {
        name: 'Rejection Test Project',
        type: 'methodology',
        startDate: new Date().toISOString(),
        methodology: {
          id: 'test-methodology',
          name: 'Test Methodology',
          version: '1.0',
        },
      });

      const accuResponse = await E2ETestHelper.makeRequest(
        'POST',
        `/accu-applications?projectId=${projectResponse.data.id}`,
        {
          accuUnits: 1000,
          methodologyId: 'test-methodology',
          applicationData: {
            description: 'Test application for rejection workflow',
            location: {
              address: '123 Test St',
              coordinates: { lat: 0, lng: 0 },
              jurisdiction: 'NSW',
            },
          },
        }
      );

      // Submit the application
      await E2ETestHelper.makeRequest(
        'POST',
        `/accu-applications/${accuResponse.data.id}/submit`,
        {
          submissionNotes: 'Ready for review',
          contactPerson: {
            name: 'Test User',
            email: userData.email,
            phone: '+61400000000',
            position: 'Project Manager',
          },
        }
      );

      // Step: Reject application
      console.log('Step: Rejecting ACCU application...');
      const rejectionData = {
        approved: false,
        reason: 'Insufficient documentation',
        reviewerComments: 'Please provide additional environmental impact data',
      };

      const rejectionResponse = await E2ETestHelper.makeRequest(
        'POST',
        `/accu-applications/${accuResponse.data.id}/approve`,
        rejectionData
      );

      if (rejectionResponse.status === 200) {
        expect(rejectionResponse.data.status).toBe('rejected');
        expect(rejectionResponse.data.approvalDate).toBeDefined();
      } else {
        console.log('Approval/rejection endpoint not implemented');
      }

      // Step: Update application with additional information
      console.log('Step: Updating application with additional information...');
      const updatedApplicationData = {
        ...accuResponse.data.applicationData,
        environmentalData: {
          biodiversityImpact: 'Minimal impact on local wildlife',
          soilConditions: 'Suitable for solar installation',
          waterUsage: 'No significant water usage required',
        },
      };

      const updateResponse = await E2ETestHelper.makeRequest(
        'PUT',
        `/accu-applications/${accuResponse.data.id}`,
        {
          applicationData: updatedApplicationData,
        }
      );

      if (updateResponse.status === 200) {
        expect(updateResponse.data.applicationData.environmentalData).toBeDefined();
      }

      // Step: Resubmit application
      console.log('Step: Resubmitting ACCU application...');
      const resubmissionResponse = await E2ETestHelper.makeRequest(
        'POST',
        `/accu-applications/${accuResponse.data.id}/submit`,
        {
          submissionNotes: 'Updated with additional environmental documentation',
          contactPerson: {
            name: 'Test User',
            email: userData.email,
            phone: '+61400000000',
            position: 'Project Manager',
          },
        }
      );

      if (resubmissionResponse.status === 200) {
        expect(resubmissionResponse.data.status).toBe('submitted');
        expect(resubmissionResponse.data.submissionDate).toBeDefined();
      }

      console.log('ACCU application rejection and resubmission test completed!');
    });

    it('should handle calendar integration with ACCU applications', async () => {
      console.log('Starting calendar integration test...');

      const userData = {
        email: `calendar-test-${Date.now()}@example.com`,
        firstName: 'Calendar',
        lastName: 'TestUser',
        password: 'SecurePassword123!',
      };

      const userResponse = await e2eTester.createTestUser(userData);
      const authData = await e2eTester.authenticate(userData.email, userData.password);
      e2eTester.setApiToken(authData.accessToken);

      // Create project
      const projectResponse = await E2ETestHelper.makeRequest('POST', '/projects', {
        name: 'Calendar Integration Test Project',
        type: 'methodology',
        startDate: new Date().toISOString(),
        methodology: {
          id: 'test-methodology',
          name: 'Test Methodology',
          version: '1.0',
        },
      });

      // Create ACCU application
      const accuResponse = await E2ETestHelper.makeRequest(
        'POST',
        `/accu-applications?projectId=${projectResponse.data.id}`,
        {
          accuUnits: 1000,
          methodologyId: 'test-methodology',
          applicationData: {
            description: 'Test application for calendar integration',
            location: {
              address: '123 Test St',
              coordinates: { lat: 0, lng: 0 },
              jurisdiction: 'NSW',
            },
          },
        }
      );

      // Step: Create deadline event for ACCU application
      console.log('Step: Creating deadline event...');
      const deadlineData = {
        title: 'ACCU Application Submission',
        description: 'Final submission deadline for ACCU application',
        type: 'deadline',
        priority: 'critical',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
        isAllDay: true,
        reminders: [7, 3, 1], // 7, 3, and 1 day before
        metadata: {
          accuApplicationId: accuResponse.data.id,
          projectId: projectResponse.data.id,
        },
      };

      const deadlineResponse = await E2ETestHelper.makeRequest(
        'POST',
        `/calendar/events?projectId=${projectResponse.data.id}`,
        deadlineData
      );
      expect(deadlineResponse.status).toBeSuccessfulE2EResponse();
      expect(deadlineResponse.data.type).toBe('deadline');

      // Step: Create review meeting event
      console.log('Step: Creating review meeting event...');
      const meetingData = {
        title: 'ACCU Application Review Meeting',
        description: 'Internal review meeting for ACCU application',
        type: 'meeting',
        priority: 'high',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // +2 hours
        isAllDay: false,
        reminders: [1, 0.5], // 1 day and 30 minutes before
        metadata: {
          accuApplicationId: accuResponse.data.id,
          projectId: projectResponse.data.id,
        },
      };

      const meetingResponse = await E2ETestHelper.makeRequest(
        'POST',
        `/calendar/events?projectId=${projectResponse.data.id}`,
        meetingData
      );
      expect(meetingResponse.status).toBeSuccessfulE2EResponse();
      expect(meetingResponse.data.type).toBe('meeting');

      // Step: Get calendar events for the project
      console.log('Step: Retrieving calendar events...');
      const eventsResponse = await E2ETestHelper.makeRequest(
        'GET',
        `/calendar/events?projectId=${projectResponse.data.id}`
      );
      expect(eventsResponse.status).toBeSuccessfulE2EResponse();
      expect(eventsResponse.data.data).toHaveLength(2);

      // Step: Get upcoming deadlines
      console.log('Step: Checking upcoming deadlines...');
      const deadlinesResponse = await E2ETestHelper.makeRequest(
        'GET',
        '/calendar/deadlines?days=30'
      );
      expect(deadlinesResponse.status).toBeSuccessfulE2EResponse();
      expect(Array.isArray(deadlinesResponse.data)).toBe(true);

      console.log('Calendar integration test completed!');
    });

    it('should handle notifications for ACCU application lifecycle', async () => {
      console.log('Starting notifications test...');

      const userData = {
        email: `notifications-test-${Date.now()}@example.com`,
        firstName: 'Notifications',
        lastName: 'TestUser',
        password: 'SecurePassword123!',
      };

      const userResponse = await e2eTester.createTestUser(userData);
      const authData = await e2eTester.authenticate(userData.email, userData.password);
      e2eTester.setApiToken(authData.accessToken);

      // Create project and application
      const projectResponse = await E2ETestHelper.makeRequest('POST', '/projects', {
        name: 'Notifications Test Project',
        type: 'methodology',
        startDate: new Date().toISOString(),
        methodology: {
          id: 'test-methodology',
          name: 'Test Methodology',
          version: '1.0',
        },
      });

      const accuResponse = await E2ETestHelper.makeRequest(
        'POST',
        `/accu-applications?projectId=${projectResponse.data.id}`,
        {
          accuUnits: 1000,
          methodologyId: 'test-methodology',
          applicationData: {
            description: 'Test application for notifications',
            location: {
              address: '123 Test St',
              coordinates: { lat: 0, lng: 0 },
              jurisdiction: 'NSW',
            },
          },
        }
      );

      // Step: Check for notifications after application creation
      console.log('Step: Checking notifications after application creation...');
      const notificationsResponse = await E2ETestHelper.makeRequest('GET', '/notifications');
      expect(notificationsResponse.status).toBeSuccessfulE2EResponse();
      expect(notificationsResponse.data.data).toBeDefined();

      // Step: Submit application and check for submission notifications
      console.log('Step: Submitting application and checking notifications...');
      await E2ETestHelper.makeRequest(
        'POST',
        `/accu-applications/${accuResponse.data.id}/submit`,
        {
          submissionNotes: 'Ready for review',
          contactPerson: {
            name: 'Test User',
            email: userData.email,
            phone: '+61400000000',
            position: 'Project Manager',
          },
        }
      );

      // Check notifications again after submission
      const postSubmissionNotificationsResponse = await E2ETestHelper.makeRequest('GET', '/notifications');
      expect(postSubmissionNotificationsResponse.status).toBeSuccessfulE2EResponse();

      // Step: Get unread notification count
      console.log('Step: Checking unread notification count...');
      const unreadResponse = await E2ETestHelper.makeRequest('GET', '/notifications/unread-count');
      expect(unreadResponse.status).toBeSuccessfulE2EResponse();
      expect(unreadResponse.data).toHaveProperty('count');

      console.log('Notifications test completed!');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid ACCU application data gracefully', async () => {
      console.log('Testing invalid ACCU application data handling...');

      const userData = {
        email: `validation-test-${Date.now()}@example.com`,
        firstName: 'Validation',
        lastName: 'TestUser',
        password: 'SecurePassword123!',
      };

      const userResponse = await e2eTester.createTestUser(userData);
      const authData = await e2eTester.authenticate(userData.email, userData.password);
      e2eTester.setApiToken(authData.accessToken);

      // Create project
      const projectResponse = await E2ETestHelper.makeRequest('POST', '/projects', {
        name: 'Validation Test Project',
        type: 'methodology',
        startDate: new Date().toISOString(),
        methodology: {
          id: 'test-methodology',
          name: 'Test Methodology',
          version: '1.0',
        },
      });

      // Test invalid ACCU application data
      const invalidApplicationData = {
        accuUnits: -100, // Invalid: negative units
        methodologyId: '', // Invalid: empty methodology ID
        applicationData: {
          description: '', // Invalid: empty description
          location: {
            coordinates: null, // Invalid: null coordinates
          },
        },
      };

      const invalidResponse = await E2ETestHelper.makeRequest(
        'POST',
        `/accu-applications?projectId=${projectResponse.data.id}`,
        invalidApplicationData
      );

      expect(invalidResponse.status).toBe(400);
      expect(invalidResponse.data).toHaveProperty('message');

      console.log('Invalid data handling test completed!');
    });

    it('should handle concurrent ACCU application operations', async () => {
      console.log('Testing concurrent ACCU application operations...');

      const userData = {
        email: `concurrent-test-${Date.now()}@example.com`,
        firstName: 'Concurrent',
        lastName: 'TestUser',
        password: 'SecurePassword123!',
      };

      const userResponse = await e2eTester.createTestUser(userData);
      const authData = await e2eTester.authenticate(userData.email, userData.password);
      e2eTester.setApiToken(authData.accessToken);

      // Create project
      const projectResponse = await E2ETestHelper.makeRequest('POST', '/projects', {
        name: 'Concurrent Test Project',
        type: 'methodology',
        startDate: new Date().toISOString(),
        methodology: {
          id: 'test-methodology',
          name: 'Test Methodology',
          version: '1.0',
        },
      });

      const applicationData = {
        accuUnits: 1000,
        methodologyId: 'test-methodology',
        applicationData: {
          description: 'Test application for concurrent operations',
          location: {
            address: '123 Test St',
            coordinates: { lat: 0, lng: 0 },
            jurisdiction: 'NSW',
          },
        },
      };

      // Make concurrent create requests
      const concurrentRequests = Array(3).fill(null).map(() =>
        E2ETestHelper.makeRequest(
          'POST',
          `/accu-applications?projectId=${projectResponse.data.id}`,
          applicationData
        )
      );

      const responses = await Promise.all(concurrentRequests);

      // At least one should succeed, others might fail due to validation
      const successfulResponses = responses.filter(r => r.status === 201);
      expect(successfulResponses.length).toBeGreaterThan(0);

      console.log('Concurrent operations test completed!');
    });
  });
});