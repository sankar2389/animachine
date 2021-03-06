import {createAnimationSource} from 'react-animachine-enhancer'

const animationSourceWrappersByTimelineId = {}
const previousCombinedTimelinesByTimelineId = {}

function getAnimationSourceWrapper(timelineId) {
  let animationSourceWrapper = animationSourceWrappersByTimelineId[timelineId]
  if (!animationSourceWrapper) {
    animationSourceWrapper = createAnimationSourceWrapper()
    animationSourceWrappersByTimelineId[timelineId] = animationSourceWrapper
  }
  return animationSourceWrapper
}

BETON.define({
  id: 'preview-animation-synchronizer',
  dependencies: ['store', 'project-manager'],
  init: ({store, projectManager}) => {
    const {selectors} = projectManager

    store.subscribe(() => {
      const projectId = selectors.getCurrentProjectId()
      const timelineId = selectors.getCurrentTimelineId()
      if (!timelineId) {
        return
      }
      //get the components loaded with the same project
      const previewComponents = selectors.getPreviewComponentsOfProject({projectId})
      //get the original source for identifying the animations related to it
      const originalSource = selectors.getOriginalSourceOfProject({projectId})
      //get the combined timeline which is also the animation source
      const combinedTimeline = selectors.combineTimeline(timelineId)
      const animationSourceWrapper = getAnimationSourceWrapper(timelineId)
      const previousCombinedTimeline =
        previousCombinedTimelinesByTimelineId[timelineId]
      previousCombinedTimelinesByTimelineId[timelineId] = combinedTimeline

      function createWrappedAnimationSource() {
        const result = animationSourceWrapper({
          animationSource: createAnimationSource({
            timeline: combinedTimeline
          }),
          timelineId,
          store
        })
        //mark the animation source with the projectId so on the next
        // update it can be recognised
        result._amProjectId = projectId
        result._amTimelineName = combinedTimeline.name

        return result
      }

      if (!matchCombinedTimelines(
        previousCombinedTimeline,
        combinedTimeline
      )) {
        previewComponents.forEach(previewComponent => {
          let findAnAnimationSourceToReplaceOnTheComponent = false

          previewComponent.__runningAnimations.forEach(runningAnimation => {
            //filter the components to the ones that actually running
            // the animation of this timeline
            const animationSource = runningAnimation._animationSource

            //a component can run animations from muliple components so
            // check if the animationSource is related to the same project with
            // the same timeline name
            if (
              (
                //if the animation source was replaced once it has a projectId
                animationSource._amProjectId === projectId ||
                //otherwise it has the same project source as the originalSource
                animationSource._amProjectSource === originalSource
              )
              && animationSource._amTimelineName === combinedTimeline.name
            ) {
              const nextAnimationSource = createWrappedAnimationSource()
              runningAnimation.replaceAnimationSource(nextAnimationSource)

              findAnAnimationSourceToReplaceOnTheComponent = true
            }
          })

          if (!findAnAnimationSourceToReplaceOnTheComponent) {
            previewComponent.addAnimation(createWrappedAnimationSource())
          }
        })
      }
    })
  }
})

//only returns false if the tracks are changed so this filters out changes
// like currentTime or pxpms which aren't relevant for render
function matchCombinedTimelines(prev, next) {
  return prev &&
    prev.tracks.length === next.tracks.length &&
    prev.tracks.every((track, i) => track === next.tracks[i])
}

function createAnimationSourceWrapper() {
  var disposeLast

  return ({animationSource, timelineId, store}) => {
    return (...args) => {
      const gsTimeline = animationSource(...args)
      const setTime = () => {
        const state = store.getState()
        const isMyTimeline = item => item.id === timelineId
        const timeline = state.projectManager.items.find(isMyTimeline)

        gsTimeline.time(timeline.currentTime / 1000)
      }

      gsTimeline.pause()
      setTime()

      if (disposeLast) {
        disposeLast()
      }
      disposeLast = store.subscribe(setTime)

      return gsTimeline
    }
  }
}
