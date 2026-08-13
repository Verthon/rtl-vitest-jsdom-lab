# Classes of problems

## Should render flavours

```tsx
import { useSteppedNavigationContext } from 'src/app/path';

describe('Stepper', () => {
  it('should render COMPONENT_NAME properly', async () => {
    mockedUseSteppedNavigationContext.mockReturnValue({ ...mockedSteppedNavigationContext, processStep: 1 });

    renderWrapper();

    expect(screen.getByText('SOME_TRANSLATION')).toBeInTheDocument();
  });
```

## What to mock and what to not

For example mocking the internal hooks/related components

Mocking the router

vi.mock('react-router', async () => ({
      ...(await vi.importActual('react-router')),
      useLocation: () => ({
        state: {
          laborerIdNo: '123',
        },
      }),
    }));

Mocking some internal and external packages hooks for permissions, auth etc

## Lack of the business oriented names

Like create a contract (insert any business name here)
repos are dominated by the things like:

- "should render Thank You page (success)"
- 'should display exitWizardModal by clicking breadcrumbs link and close by clicking submit button'
- 'should render properly for external' - external is props name

## Lack of clear patterns for

- testing upload of files
- 

## [Low prio] Using fireEvent instead of userEvent to speed up tests

Especially when the amount of test is large