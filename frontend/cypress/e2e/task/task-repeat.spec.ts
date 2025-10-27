import {createFakeUserAndLogin} from '../../support/authenticateUser'

import {TaskFactory} from '../../factories/task'
import {ProjectFactory} from '../../factories/project'
import {UserProjectFactory} from '../../factories/users_project'
import {BucketFactory} from '../../factories/bucket'
import {createDefaultViews} from '../project/prepareProjects'

// Type definitions
interface Project {
	id: number
	title: string
	identifier?: string
}

interface Task {
	id: number
	title: string
	project_id: number
	repeat_after: number
	repeat_mode: number
}

interface Bucket {
	id: number
}

describe('Task Repeat Patterns', () => {
	createFakeUserAndLogin()

	let projects: Project[]
	let buckets: Bucket[]

	beforeEach(() => {
		projects = ProjectFactory.create(1) as Project[]
		const views = createDefaultViews(projects[0]!.id) as any[]
		buckets = BucketFactory.create(1, {
			project_view_id: views[3]!.id,
		}) as Bucket[]
		TaskFactory.truncate()
		UserProjectFactory.truncate()
	})

	it('Should create task with weekdays preset (repeat_mode=3)', () => {
		const tasks = TaskFactory.create(1, {
			id: 1,
			project_id: projects[0]!.id,
		}) as Task[]

		cy.visit(`/tasks/${tasks[0]!.id}`)

		// Open repeat settings
		cy.get('.task-view .action-buttons .button')
			.contains('Set Repeat')
			.click()

		// Click weekdays preset button
		cy.get('.repeat-after')
			.contains('button', 'Weekdays')
			.click()

		// Save the task (trigger update)
		cy.get('.task-view .heading-container h1 input')
			.type('{enter}')

		// Wait for API call
		cy.wait(1000)

		// Verify the task was updated with repeat_mode=3
		cy.intercept('GET', `/api/v1/tasks/${tasks[0]!.id}`).as('getTask')
		cy.reload()
		cy.wait('@getTask').then((interception) => {
			expect(interception.response?.body.repeat_mode).to.equal(3)
			expect(interception.response?.body.repeat_after).to.be.greaterThan(0)
		})
	})

	it('Should create task with weekends preset (repeat_mode=4)', () => {
		const tasks = TaskFactory.create(1, {
			id: 2,
			project_id: projects[0]!.id,
		}) as Task[]

		cy.visit(`/tasks/${tasks[0]!.id}`)

		// Open repeat settings
		cy.get('.task-view .action-buttons .button')
			.contains('Set Repeat')
			.click()

		// Click weekends preset button
		cy.get('.repeat-after')
			.contains('button', 'Weekends')
			.click()

		// Save the task (trigger update)
		cy.get('.task-view .heading-container h1 input')
			.type('{enter}')

		// Wait for API call
		cy.wait(1000)

		// Verify the task was updated with repeat_mode=4
		cy.intercept('GET', `/api/v1/tasks/${tasks[0]!.id}`).as('getTask')
		cy.reload()
		cy.wait('@getTask').then((interception) => {
			expect(interception.response?.body.repeat_mode).to.equal(4)
			expect(interception.response?.body.repeat_after).to.be.greaterThan(0)
		})
	})

	it('Should switch between repeat presets correctly', () => {
		const tasks = TaskFactory.create(1, {
			id: 3,
			project_id: projects[0]!.id,
		}) as Task[]

		cy.visit(`/tasks/${tasks[0]!.id}`)

		// Open repeat settings
		cy.get('.task-view .action-buttons .button')
			.contains('Set Repeat')
			.click()

		// Click weekdays first
		cy.get('.repeat-after')
			.contains('button', 'Weekdays')
			.click()

		// Wait for update
		cy.wait(500)

		// Then click weekends
		cy.get('.repeat-after')
			.contains('button', 'Weekends')
			.click()

		// Save the task
		cy.get('.task-view .heading-container h1 input')
			.type('{enter}')

		// Wait for API call
		cy.wait(1000)

		// Verify the task has the last clicked preset (weekends = mode 4)
		cy.intercept('GET', `/api/v1/tasks/${tasks[0]!.id}`).as('getTask')
		cy.reload()
		cy.wait('@getTask').then((interception) => {
			expect(interception.response?.body.repeat_mode).to.equal(4)
		})
	})

	it('Should display weekday repeat pattern in task list', () => {
		TaskFactory.create(1, {
			id: 4,
			project_id: projects[0]!.id,
			title: 'Weekday task',
			repeat_after: 86400, // 1 day
			repeat_mode: 3, // Weekdays
		})

		cy.visit(`/projects/${projects[0]!.id}`)

		// Task should have repeat icon
		cy.get('.tasks .task')
			.contains('Weekday task')
			.should('exist')

		// Verify repeat icon is visible (assuming there's a repeat indicator)
		cy.get('.tasks .task')
			.contains('Weekday task')
			.parent()
			.within(() => {
				// Icon might have class 'icon' or specific data attribute
				cy.get('[data-icon="history"]')
					.should('exist')
			})
	})

	it('Should display weekend repeat pattern in task list', () => {
		TaskFactory.create(1, {
			id: 5,
			project_id: projects[0]!.id,
			title: 'Weekend task',
			repeat_after: 86400, // 1 day
			repeat_mode: 4, // Weekends
		})

		cy.visit(`/projects/${projects[0]!.id}`)

		// Task should have repeat icon
		cy.get('.tasks .task')
			.contains('Weekend task')
			.should('exist')

		// Verify repeat icon is visible
		cy.get('.tasks .task')
			.contains('Weekend task')
			.parent()
			.within(() => {
				cy.get('[data-icon="history"]')
					.should('exist')
			})
	})
})
