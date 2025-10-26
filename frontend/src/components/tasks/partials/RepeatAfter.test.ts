import {describe, it, expect, beforeEach} from 'vitest'
import {mount} from '@vue/test-utils'
import {setActivePinia, createPinia} from 'pinia'
import {createI18n} from 'vue-i18n'
import RepeatAfter from './RepeatAfter.vue'
import {TASK_REPEAT_MODES} from '@/types/IRepeatMode'
import TaskModel from '@/models/task'
import en from '@/i18n/lang/en.json'

const i18n = createI18n({legacy: false, locale: 'en', messages: {en}})

function mountRepeatAfter(taskProps = {}) {
	const task = new TaskModel({
		repeatAfter: {amount: 0, type: 'days'},
		repeatMode: TASK_REPEAT_MODES.REPEAT_MODE_DEFAULT,
		...taskProps,
	})
	return mount(RepeatAfter, {
		props: {modelValue: task},
		global: {
			plugins: [i18n],
		},
	})
}

describe('RepeatAfter weekday preset button', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it('renders weekdays button with correct label', () => {
		const wrapper = mountRepeatAfter()
		expect(wrapper.text()).toContain('Weekdays')
	})

	it('weekdays button has correct aria-label', () => {
		const wrapper = mountRepeatAfter()
		const html = wrapper.html()
		expect(html).toContain('aria-label')
		expect(html).toContain('Repeats Monday through Friday only')
	})

	it('clicking weekdays button emits update with repeatMode=3', async () => {
		const wrapper = mountRepeatAfter()
		// Call the component method directly to test the logic
		await (wrapper.vm as any).setRepeatAfter(1, 'days', TASK_REPEAT_MODES.REPEAT_MODE_WEEKDAYS)
		await wrapper.vm.$nextTick()

		const emitted = wrapper.emitted('update:modelValue')
		expect(emitted).toBeTruthy()
		const lastEmitted = emitted?.pop()?.[0] as any
		expect(lastEmitted?.repeatMode).toBe(TASK_REPEAT_MODES.REPEAT_MODE_WEEKDAYS)
		expect(lastEmitted?.repeatMode).toBe(3)
	})

	it('clicking weekdays button sets repeat amount to 1 day', async () => {
		const wrapper = mountRepeatAfter()
		// Call the component method directly to test the logic
		await (wrapper.vm as any).setRepeatAfter(1, 'days', TASK_REPEAT_MODES.REPEAT_MODE_WEEKDAYS)
		await wrapper.vm.$nextTick()

		const emitted = wrapper.emitted('update:modelValue')
		const lastEmitted = emitted?.pop()?.[0] as any
		expect(lastEmitted?.repeatAfter.amount).toBe(1)
		expect(lastEmitted?.repeatAfter.type).toBe('days')
	})
})
