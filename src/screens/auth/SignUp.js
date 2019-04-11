import React, { Fragment } from "react"
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	KeyboardAvoidingView,
	TouchableOpacity,
	Platform,
	Keyboard,
	Alert
} from "react-native"
import { connect } from "react-redux"
import { register } from "../../actions/auth"
import { API_ERROR } from "../../reducers/consts"
import validate, { registerValidation } from "../../actions/validate"
import { strings, errors } from "../../i18n"
import AuthInput from "../../components/AuthInput"
import { MAIN_PADDING, DEFAULT_IMAGE, signUpRoles } from "../../consts"
import { Icon } from "react-native-elements"
import LoadingButton from "../../components/LoadingButton"
import { popLatestError } from "../../actions/utils"
import UploadProfileImage from "../../components/UploadProfileImage"
import SuccessModal from "../../components/SuccessModal"
import InputSelectionButton from "../../components/InputSelectionButton"

export class SignUp extends React.Component {
	constructor(props) {
		super(props)
		this.register = this.register.bind(this)
		this.role = this.props.navigation.getParam("role")
		this.state = {
			successVisible: false,
			image: "",
			teachers: [],
			teacher_id: null
		}
		this._initInputs()
		this._getTeachers()
	}

	_initInputs = () => {
		let extraInputs
		if (this.role == signUpRoles.teacher) {
			extraInputs = {
				duration: {
					iconName: "access-time",
					placeholder: strings("signup.duration")
				},
				price: {
					iconName: "payment",
					placeholder: strings("signup.price")
				}
			}
		}
		this.inputs = {
			email: {},
			name: { iconName: "person", placeholder: strings("signup.name") },
			area: {
				iconName: "person-pin",
				placeholder: strings("signup.area")
			},
			phone: {
				iconName: "phone",
				placeholder: strings("signup.phone"),
				onChangeText: (name, value) => {
					this.setState({ [name]: value.replace(/[^0-9]/g, "") })
				}
			},
			...extraInputs,
			password: { secureTextEntry: true, iconName: "security" }
		}
		Object.keys(this.inputs).forEach(input => {
			this.state[input] = ""
		})
	}

	componentDidMount() {
		if (Platform.OS === "android") {
			this.keyboardEventListeners = [
				Keyboard.addListener(
					"keyboardDidShow",
					this._handleKeyboardShow
				),
				Keyboard.addListener(
					"keyboardDidHide",
					this._handleKeyboardHide
				)
			]
		}
	}

	componentWillUnmount() {
		this.keyboardEventListeners &&
			this.keyboardEventListeners.forEach(eventListener =>
				eventListener.remove()
			)
	}

	_getTeachers = async () => {
		const resp = await this.props.fetchService.fetch("/teacher/", {
			method: "GET"
		})
		this.setState({
			teachers: resp.json["data"]
		})
	}

	_onTeacherPress = teacher => {
		this.setState({
			teacher_id: teacher.teacher_id,
			teacher: teacher.user.name
		})
	}

	_renderTeachers = () => {
		return this.state.teachers.map((teacher, index) => {
			let style = {}
			if (index == 0) {
				style = { marginLeft: 0 }
			}
			let selected = false
			let selectedTextStyle
			if (this.state.teacher == teacher.user.name) {
				selected = true
				selectedTextStyle = { color: "#fff" }
			}
			return (
				<InputSelectionButton
					selected={selected}
					key={`teacher${index}`}
					onPress={() => this._onTeacherPress(teacher)}
					style={style}
				>
					<Text
						style={{
							...styles.hoursText,
							...selectedTextStyle
						}}
					>
						{teacher.user.name}
					</Text>
				</InputSelectionButton>
			)
		})
	}

	_handleKeyboardHide = () => {
		this.scrollView.scrollTo({ y: 0 })
	}

	_handleKeyboardShow = () => {
		this.scrollView.scrollToEnd()
	}

	componentDidUpdate() {
		const error = this.props.dispatch(popLatestError(API_ERROR))
		if (error) {
			Alert.alert(strings("errors.title"), errors(error))
		}
	}

	async register() {
		let error,
			flag = true
		for (let input of Object.keys(this.inputs)) {
			error = validate(input, this.state[input], registerValidation)
			if (error) {
				flag = false
				break
			}
		}

		if (!flag) {
			Alert.alert(error)
			return
		}
		if (!this.state.teacher_id && this.role == signUpRoles.student) {
			Alert.alert(errors("select_teacher"))
			return
		}
		this.button.showLoading(true)
		await this.props.dispatch(
			register(
				{
					email: this.state.email,
					area: this.state.area,
					password: this.state.password,
					name: this.state.name,
					phone: this.state.phone,
					image: this.state.image,
					price: parseInt(this.state.price),
					duration: parseInt(this.state.duration),
					teacher_id: this.state.teacher_id
				},
				user => {
					if (user) {
						this.setState({ successVisible: true })
					} else {
						this.button.showLoading(false)
					}
				},
				this.role
			)
		)
	}

	_onChangeText = (name, input) => {
		this.setState({ [name]: input })
	}

	renderInputs = () => {
		return Object.keys(this.inputs).map((name, index) => {
			const props = this.inputs[name]
			return (
				<AuthInput
					key={`key${name}`}
					name={name}
					placeholder={props.placeholder || strings("signin." + name)}
					onChangeText={
						props.onChangeText || this._onChangeText.bind(this)
					}
					value={this.state[name]}
					testID={`r${name}Input`}
					iconName={props.iconName || name}
					validation={registerValidation}
					secureTextEntry={props.secureTextEntry || false}
				/>
			)
		})
	}

	render() {
		let selectTeacher
		if (this.role == signUpRoles.student) {
			selectTeacher = (
				<View style={styles.teachers}>
					<Text style={styles.nonInputTitle}>
						{strings("signup.teacher")}
					</Text>
					<View style={styles.teachersList}>
						{this._renderTeachers()}
					</View>
				</View>
			)
		}
		return (
			<View style={styles.container}>
				<SuccessModal
					visible={this.state.successVisible}
					image="signup"
					title={strings("signup.success_title")}
					desc={strings("signup." + this.role + "_success_desc")}
					buttonPress={() => {
						this.setState({ successVisible: false })
						this.props.navigation.navigate("App")
					}}
					button={strings("signup.success_button")}
				/>
				<TouchableOpacity
					onPress={() => {
						this.props.navigation.goBack()
					}}
					style={styles.backButton}
				>
					<Icon name="arrow-forward" type="material" />
				</TouchableOpacity>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "position" : null}
				>
					<ScrollView
						keyboardDismissMode={
							Platform.OS === "ios" ? "interactive" : "on-drag"
						}
						keyboardShouldPersistTaps="handled"
						ref={r => (this.scrollView = r)}
					>
						<View style={styles.formContainer}>
							<UploadProfileImage
								style={styles.profilePic}
								image={this.state.image.uri || DEFAULT_IMAGE}
								upload={async source => {
									this.setState({
										image: source
									})
								}}
							/>
							{this.renderInputs()}

							{selectTeacher}
							<LoadingButton
								title={strings("signup.signup_button")}
								onPress={this.register}
								ref={c => (this.button = c)}
								style={styles.button}
								indicatorColor="#fff"
							/>
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
			</View>
		)
	}
}

const styles = StyleSheet.create({
	error: {
		marginTop: 12,
		color: "red",
		fontSize: 12
	},
	backButton: {
		alignSelf: "flex-start",
		marginTop: 12,
		marginLeft: MAIN_PADDING
	},
	form: {
		flex: 1,
		marginTop: MAIN_PADDING
	},
	button: {
		marginTop: 20
	},
	profilePic: {
		width: 80,
		height: 80,
		borderRadius: 40,
		alignSelf: "center"
	},
	container: {
		flex: 1
	},
	formContainer: {
		flex: 1,
		paddingLeft: MAIN_PADDING,
		paddingRight: MAIN_PADDING,
		alignItems: "center",
		paddingBottom: 20
	},
	nonInputTitle: {
		marginTop: 12,
		alignSelf: "flex-start",
		fontWeight: "bold"
	},
	teachers: {
		flex: 1,
		alignSelf: "flex-start",
		marginLeft: MAIN_PADDING
	},
	teachersList: {
		flex: 1,
		flexWrap: "wrap",
		flexDirection: "row",
		justifyContent: "flex-start"
	}
})

const mapStateToProps = state => {
	return {
		errors: state.errors,
		fetchService: state.fetchService
	}
}

export default connect(mapStateToProps)(SignUp)
