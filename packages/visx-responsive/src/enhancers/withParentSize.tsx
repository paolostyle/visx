import debounce from 'lodash/debounce';
import React from 'react';
import { getResizeObserver, ResizeObserver, ResizeObserverPolyfill } from '../resizeObserver';
import { Simplify } from '../types';

const CONTAINER_STYLES = { width: '100%', height: '100%' };

/**
 * @deprecated
 * @TODO remove in the next major version - exported for backwards compatibility
 */
export type WithParentSizeProps = Pick<
  WithParentSizeConfig,
  'debounceTime' | 'enableDebounceLeadingCall'
>;

type WithParentSizeConfig = {
  debounceTime?: number;
  enableDebounceLeadingCall?: boolean;
  initialWidth?: number;
  initialHeight?: number;
};

type WithParentSizeState = {
  parentWidth?: number;
  parentHeight?: number;
};

export type WithParentSizeProvidedProps = WithParentSizeState;

type WithParentSizeComponentProps<P extends WithParentSizeProvidedProps> = Simplify<
  Omit<P, keyof WithParentSizeProvidedProps> & WithParentSizeConfig
>;

export default function withParentSize<P extends WithParentSizeProvidedProps>(
  BaseComponent: React.ComponentType<P>,
  /**
   * @deprecated - use `setResizeObserverPolyfill`
   * @TODO remove in the next major version
   * Optionally inject a ResizeObserver polyfill, else this *must* be globally available.
   */
  resizeObserverPolyfill?: ResizeObserverPolyfill,
): React.ComponentType<WithParentSizeComponentProps<P>> {
  return class WrappedComponent extends React.Component<
    WithParentSizeComponentProps<P>,
    WithParentSizeState
  > {
    displayName = `withParentSize(${
      BaseComponent.displayName ?? BaseComponent.name ?? 'Component'
    })`;
    state = {
      parentWidth: undefined,
      parentHeight: undefined,
    };
    animationFrameID: number = 0;
    resizeObserver: ResizeObserver | undefined;
    container: HTMLDivElement | null = null;

    componentDidMount() {
      const ResizeObserverLocal = resizeObserverPolyfill || getResizeObserver();

      this.resizeObserver = new ResizeObserverLocal((entries) => {
        entries.forEach((entry) => {
          const { width, height } = entry.contentRect;
          this.animationFrameID = window.requestAnimationFrame(() => {
            this.resize({
              width,
              height,
            });
          });
        });
      });
      if (this.container) this.resizeObserver.observe(this.container);
    }

    componentWillUnmount() {
      window.cancelAnimationFrame(this.animationFrameID);
      if (this.resizeObserver) this.resizeObserver.disconnect();
      this.resize.cancel();
    }

    setRef = (ref: HTMLDivElement) => {
      this.container = ref;
    };

    resize = debounce(
      // eslint-disable-next-line unicorn/consistent-function-scoping
      ({ width, height }: { width: number; height: number }) => {
        this.setState({
          parentWidth: width,
          parentHeight: height,
        });
      },
      this.props.debounceTime ?? 300,
      { leading: this.props.enableDebounceLeadingCall ?? true },
    );

    render() {
      const { initialWidth, initialHeight } = this.props;
      const { parentWidth = initialWidth, parentHeight = initialHeight } = this.state;
      return (
        <div style={CONTAINER_STYLES} ref={this.setRef}>
          {parentWidth != null && parentHeight != null && (
            <BaseComponent
              parentWidth={parentWidth}
              parentHeight={parentHeight}
              {...(this.props as P)}
            />
          )}
        </div>
      );
    }
  };
}
