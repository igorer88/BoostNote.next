import React, { useMemo } from 'react'
import { getStorageItemId } from '../../lib/nav'
import { useGeneralStatus } from '../../lib/generalStatus'
import { useDialog, DialogIconTypes } from '../../lib/dialog'
import { useDb } from '../../lib/db'
import { useRouter, usePathnameWithoutNoteId } from '../../lib/router'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../lib/toast'
import { useFirstUser } from '../../lib/preferences'
import { useContextMenu, MenuTypes } from '../../lib/contextMenu'
import NavigatorItem from '../atoms/NavigatorItem'
import { NoteStorage } from '../../lib/db/types'
import {
  mdiTrashCanOutline,
  mdiBookOpenOutline,
  mdiPaperclip,
  mdiTuneVertical,
  mdiCloudOutline,
  mdiPlus,
} from '@mdi/js'
import FolderListFragment from './FolderListFragment'
import TagListFragment from './TagListFragment'
import NavigatorHeader from '../atoms/NavigatorHeader'
import NavigatorButton from '../atoms/NavigatorButton'
import styled from '../../lib/styled'

const Spacer = styled.div`
  height: 1em;
`

interface StorageNavigatorFragmentProps {
  storage: NoteStorage
}

const StorageNavigatorFragment = ({
  storage,
}: StorageNavigatorFragmentProps) => {
  const { openSideNavFolderItemRecursively } = useGeneralStatus()
  const { prompt, messageBox } = useDialog()
  const {
    createFolder,
    renameFolder,
    renameStorage,
    removeStorage,
    syncStorage,
  } = useDb()
  const { push } = useRouter()
  const { t } = useTranslation()
  const { pushMessage } = useToast()
  const currentPathname = usePathnameWithoutNoteId()
  const user = useFirstUser()
  const { popup } = useContextMenu()

  const itemId = getStorageItemId(storage.id)
  const showPromptToCreateFolder = (folderPathname: string) => {
    prompt({
      title: 'Create a Folder',
      message: 'Enter the path where do you want to create a folder',
      iconType: DialogIconTypes.Question,
      defaultValue: folderPathname === '/' ? '/' : `${folderPathname}/`,
      submitButtonLabel: 'Create Folder',
      onClose: async (value: string | null) => {
        if (value == null) {
          return
        }
        if (value.endsWith('/')) {
          value = value.slice(0, value.length - 1)
        }
        await createFolder(storage.id, value)

        push(`/app/storages/${storage.id}/notes${value}`)

        // Open folder item
        openSideNavFolderItemRecursively(storage.id, value)
      },
    })
  }
  const showPromptToRenameFolder = (folderPathname: string) => {
    prompt({
      title: t('folder.rename'),
      message: t('folder.renameMessage'),
      iconType: DialogIconTypes.Question,
      defaultValue: folderPathname.split('/').pop(),
      submitButtonLabel: t('folder.rename'),
      onClose: async (value: string | null) => {
        const folderPathSplit = folderPathname.split('/')
        if (value == null || value === '' || value === folderPathSplit.pop()) {
          return
        }
        const newPathname = folderPathSplit.join('/') + '/' + value
        try {
          await renameFolder(storage.id, folderPathname, newPathname)
          push(`/app/storages/${storage.id}/notes${newPathname}`)
          openSideNavFolderItemRecursively(storage.id, newPathname)
        } catch (error) {
          pushMessage({
            title: t('general.error'),
            description: t('folder.renameErrorMessage'),
          })
        }
      },
    })
  }

  const allNotesPagePathname = `/app/storages/${storage.id}/notes`
  const allNotesPageIsActive = currentPathname === allNotesPagePathname

  const trashcanPagePathname = `/app/storages/${storage.id}/trashcan`
  const trashcanPageIsActive = currentPathname === trashcanPagePathname

  const attachmentsPagePathname = `/app/storages/${storage.id}/attachments`
  const attachmentsPageIsActive = currentPathname === attachmentsPagePathname

  const openContextMenu: React.MouseEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    popup(event, [
      {
        type: MenuTypes.Normal,
        label: t('storage.rename'),
        onClick: async () => {
          prompt({
            title: `Rename "${storage.name}" storage`,
            message: t('storage.renameMessage'),
            iconType: DialogIconTypes.Question,
            defaultValue: storage.name,
            submitButtonLabel: t('storage.rename'),
            onClose: async (value: string | null) => {
              if (value == null) return
              await renameStorage(storage.id, value)
            },
          })
        },
      },
      {
        type: MenuTypes.Normal,
        label: t('storage.remove'),
        onClick: async () => {
          messageBox({
            title: `Remove "${storage.name}" storage`,
            message: t('storage.removeMessage'),
            iconType: DialogIconTypes.Warning,
            buttons: [t('storage.remove'), t('general.cancel')],
            defaultButtonIndex: 0,
            cancelButtonIndex: 1,
            onClose: (value: number | null) => {
              if (value === 0) {
                removeStorage(storage.id)
              }
            },
          })
        },
      },
    ])
  }

  const attachments = useMemo(() => Object.values(storage.attachmentMap), [
    storage.attachmentMap,
  ])
  const trashed = useMemo(
    () => Object.values(storage.noteMap).filter((note) => note!.trashed),
    [storage.noteMap]
  )

  return (
    <React.Fragment key={itemId}>
      <NavigatorHeader
        label={storage.name}
        onContextMenu={openContextMenu}
        control={
          <>
            <NavigatorButton
              onClick={() => showPromptToCreateFolder('/')}
              iconPath={mdiPlus}
            />
            <NavigatorButton
              onClick={() => {
                if (user == null) {
                  pushMessage({
                    title: 'No User Error',
                    description: 'Please login first to sync the storage.',
                  })
                  return
                }
                syncStorage(storage.id)
              }}
              iconPath={mdiCloudOutline}
            />
            <NavigatorButton
              onClick={() => push(`/app/storages/${storage.id}`)}
              iconPath={mdiTuneVertical}
            />
          </>
        }
      />
      <NavigatorItem
        depth={0}
        label='All Notes'
        iconPath={mdiBookOpenOutline}
        active={allNotesPageIsActive}
        onClick={() => push(allNotesPagePathname)}
      />
      <FolderListFragment
        storage={storage}
        showPromptToCreateFolder={showPromptToCreateFolder}
        showPromptToRenameFolder={showPromptToRenameFolder}
      />
      <TagListFragment storage={storage} />
      {attachments.length > 0 && (
        <NavigatorItem
          depth={0}
          label={t('general.attachments')}
          iconPath={mdiPaperclip}
          active={attachmentsPageIsActive}
          onClick={() => push(attachmentsPagePathname)}
          onContextMenu={(event) => {
            event.preventDefault()
          }}
        />
      )}
      {trashed.length > 0 && (
        <NavigatorItem
          depth={0}
          label={t('general.trash')}
          iconPath={mdiTrashCanOutline}
          active={trashcanPageIsActive}
          onClick={() => push(trashcanPagePathname)}
          onContextMenu={(event) => {
            event.preventDefault()
            // TODO: Implement context menu(restore all notes)
          }}
        />
      )}
      <Spacer />
    </React.Fragment>
  )
}

export default StorageNavigatorFragment