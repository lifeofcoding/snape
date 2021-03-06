/* eslint-disable jsx-a11y/no-static-element-interactions,no-const-assign */
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import styled, { css } from 'styled-components';
import classNames from 'classnames';
import isRenderer from 'is-electron-renderer';
import { remote, shell } from 'electron';
import withRedux from 'next-redux-wrapper';
import initStore from '../store';
import MediaModal from './MediaModal';
import getFileType from '../utils/fileType';
import colors from '../constants/colors';
import castUtil from '../utils/cast';
import isPlayable, { isVideo, isImage, isAudio } from '../utils/isPlayable';
import { FixedWidthTd } from '../utils/commonStyles';

let vlc;
if (isRenderer) {
  vlc = remote.require('./utils/vlc');
}

const Wrapper = styled.div`
  width: 100%;
  background-color: white;
  bottom: 0;
  flex: 1;
  border-bottom: 1px solid #eee;
  overflow: hidden;
  display: flex;
  justify-content: center;
`;

const TileWrapper = styled.div`
  color: ${props => props.color};
  height: 3rem;
  width: 4rem;
  display: flex;
  align-items: center;
  align-content: space-around;
  font-size: 13px;
`;

const Table = styled.table`
  overflow: scroll;
  flex: 1;
  width: 100%;
`;

const Files = styled.div`
  flex: ${props => (props.showOnlyDetails ? '1' : '0.6')};
  padding: 10px;
  overflow: scroll;
`;

const Info = styled.div`
  flex: 0.4;
`;

const VlcIcon = styled.i`
  color: #ff6000;
  cursor: pointer;
  opacity: 0.8;
  &:hover {
    opacity: 1;
  }
`;

const ProgressContainer = styled.td`
  width: 190px;
  padding: 0 22px 6px 10px;
`;

const Name = styled.td`
  max-width: 270px;
  color: ${props => (props.isDownloaded ? colors.primary : 'black')};

  ${props =>
    props.isDownloaded &&
    css`
      color: ${colors.primary};
      &:hover {
        color: ${colors.darkPrimary};
      }
    `};
`;

@withRedux(initStore, ({ cast, details }) => ({
  cast,
  details,
}))
export default class Description extends PureComponent {
  static propTypes = {
    dispatch: PropTypes.func,
    details: PropTypes.shape({
      name: PropTypes.string,
      infoHash: PropTypes.string,
      loading: PropTypes.bool,
      files: PropTypes.shape({
        name: PropTypes.string,
        type: PropTypes.string,
        size: PropTypes.string,
      }),
    }),
    // eslint-disable-next-line react/require-default-props
    customDetails: PropTypes.shape({
      name: PropTypes.string,
      infoHash: PropTypes.string,
      loading: PropTypes.bool,
      files: PropTypes.shape({
        name: PropTypes.string,
        type: PropTypes.string,
        size: PropTypes.string,
      }),
    }),
    cast: PropTypes.shape({
      selectedPlayer: PropTypes.any,
    }).isRequired,
    showOnlyDetails: PropTypes.bool,
    showProgress: PropTypes.bool,
  };

  static defaultProps = {
    showOnlyDetails: false,
    dispatch() {},
    details: {},
    fixed: false,
    showProgress: false,
  };

  constructor(props) {
    super(props);

    this.state = {
      streaming: false,
      selectedIndex: null,
      isVlcPresent: true,
    };
  }

  componentDidMount() {
    this.isVlcPresent();
  }

  getFiles = () => {
    const {
      details, showOnlyDetails, showProgress, customDetails,
    } = this.props;

    // eslint-disable-next-line no-const-assign
    const d = customDetails || details;

    const x =
      d &&
      d.files &&
      d.files.map((file, i) => {
        const streamIcon = classNames('mdi tooltip tooltip-left fs-18', {
          'mdi-play-circle-outline': isVideo(file.name) || isAudio(file.name),
          'mdi-eye': isImage(file.name),
        });

        const nameClass = classNames('text-ellipsis', {
          pointer: file.done,
        });

        return (
          <tr key={file.name}>
            <FixedWidthTd width="40px">{this.getFileIcon(file.type)}</FixedWidthTd>
            <Name
              isDownloaded={file.done}
              className={nameClass}
              onClick={() => this.openFile(file)}
            >
              {file.name}
            </Name>

            {showProgress && (
              <ProgressContainer>
                <progress className="progress" max="100" value={Math.min(file.progress, 100)} />
              </ProgressContainer>
            )}

            <td>{file.size}</td>
            {this.state.isVlcPresent && (
              <FixedWidthTd width="40px">
                {isVideo(file.name) && (
                  <VlcIcon
                    data-id={i}
                    data-tooltip="Play on VLC"
                    onClick={this.streamOnVlc}
                    className="mdi mdi-vlc fs-18 tooltip tooltip-left"
                  />
                )}
              </FixedWidthTd>
            )}
            <FixedWidthTd width="40px">
              {isPlayable(file.name) && (
                <button className="btn btn-link" onClick={this.startStream} data-id={i}>
                  <i
                    className={streamIcon}
                    data-tooltip={isVideo(file.name) ? 'Play Video' : 'View Image'}
                    data-id={i}
                  />
                </button>
              )}
            </FixedWidthTd>
          </tr>
        );
      });

    return (
      <Files showOnlyDetails={showOnlyDetails}>
        <Table>
          <tbody>{x}</tbody>
        </Table>
      </Files>
    );
  };

  getFileIcon = (mime) => {
    let icon;

    switch (getFileType(mime)) {
      case 'audio':
        icon = 'mdi-music-note';
        break;
      case 'video':
        icon = 'mdi-movie';
        break;
      case 'application':
        icon = 'mdi-application';
        break;
      case 'zip':
        icon = 'mdi-zip-box';
        break;
      case 'image':
        icon = 'mdi-file-image';
        break;
      default:
        icon = 'mdi-file-document';
    }
    return (
      <TileWrapper color={colors.primary}>
        <i style={{ fontSize: '18px' }} className={`mdi ${icon} centered`} />
      </TileWrapper>
    );
  };

  closeModal = () => {
    this.setState({ streaming: false });
  };

  isVlcPresent = () => {
    vlc.isVlcPresent(isVlcPresent =>
      this.setState({
        isVlcPresent,
      }));
  };

  streamOnVlc = (e) => {
    const d = this.props.customDetails || this.props.details;
    const selectedIndex = e.target.dataset.id;
    const file = d.files[selectedIndex];
    vlc.kill();
    vlc.playOnVlc(
      `http://127.0.0.1:${window.location.port}/api/download/${file.slug.replace(/ /g, '.')}`,
      file.name,
    );
  };

  openFile = (file) => {
    if (!file.done) return;
    shell.openItem(file.path);
  };

  startStream = (e) => {
    const {
      customDetails, details, cast, dispatch,
    } = this.props;

    const selectedIndex = e.target.dataset.id;

    const d = customDetails || details;

    const file = d.files[selectedIndex];

    // if a cast player is selected then stream on the chromecast
    if (cast.selectedPlayer) {
      const fileDetails = {
        name: file.name,
        index: e.target.dataset.id,
        infoHash: d.infoHash,
        type: file.type,
      };

      castUtil.play(fileDetails, (err) => {
        if (!err) {
          dispatch({
            type: 'SET_STREAMING_FILE',
            payload: fileDetails,
          });
        } else {
          dispatch({
            type: 'REMOVE_STREAMING_FILE',
          });
        }
      });
      return;
    }

    dispatch({
      type: 'SET_SELECTED_TORRENT',
      payload: file,
    });

    // if no cast is connected stream in the app
    this.setState({
      streaming: true,
      selectedIndex,
    });
  };

  render() {
    const { details, showOnlyDetails, customDetails } = this.props;
    const { selectedIndex, streaming } = this.state;

    const d = customDetails || details;

    if (d.loading || !d.name) {
      return (
        <Wrapper>
          <div className="loading" />
        </Wrapper>
      );
    }

    const file = d.files[selectedIndex];

    const imageFiles = d.files.filter(f => isImage(f.name));

    return (
      <Wrapper>
        {!showOnlyDetails && <Info />}
        {this.getFiles()}
        <MediaModal
          infoHash={d.infoHash}
          fileIndex={selectedIndex}
          showModal={streaming && !isAudio(file.name)}
          file={file}
          imageFiles={imageFiles}
          onCloseClick={this.closeModal}
        />
      </Wrapper>
    );
  }
}
